import {
  AddCheckTrackingNoteUseCase,
  GetCheckImageUseCase,
  GetCheckTrackingUseCase,
  RegisterReceivedCheckUseCase,
  TransferCheckUseCase,
  UploadCheckImageUseCase,
} from '@hivork/application';
import {
  LocalFileStorageService,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaCheckRepository,
  PrismaCheckTrackingNoteRepository,
  PrismaInstallmentRepository,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaStoredFileRepository,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;

async function probeDatabase(): Promise<boolean> {
  if (!databaseUrl) {
    return false;
  }

  const probe = new PrismaService();
  try {
    await probe.$connect();
    await probe.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
}

const dbAvailable = await probeDatabase();
const describeIfDb = dbAvailable ? describe : describe.skip;

function staffContext(branchId: string, staffId: string) {
  return {
    staffId,
    dataScope: 'all' as const,
    assignedBranchIds: [branchId],
    activeBranchId: branchId,
  };
}

describeIfDb('Check tracking + image (IFP-116 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const checks = new PrismaCheckRepository(prisma);
  const storedFiles = new PrismaStoredFileRepository(prisma);
  const trackingNotes = new PrismaCheckTrackingNoteRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  let storageRoot = '';
  let fileStorage: LocalFileStorageService;

  const registerReceivedCheck = new RegisterReceivedCheckUseCase(
    unitOfWork,
    checks,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
  );
  const transferCheck = new TransferCheckUseCase(unitOfWork, checks, branches, audit);
  const getCheckTracking = new GetCheckTrackingUseCase(
    checks,
    trackingNotes,
    branches,
    audit,
  );
  const addCheckTrackingNote = new AddCheckTrackingNoteUseCase(
    unitOfWork,
    checks,
    trackingNotes,
    branches,
    audit,
  );

  let uploadCheckImage: UploadCheckImageUseCase;
  let getCheckImage: GetCheckImageUseCase;

  beforeAll(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'hivork-check-image-'));
    fileStorage = new LocalFileStorageService({
      rootPath: storageRoot,
      signingSecret: 'test-signing-secret-minimum-32-characters-long',
      publicApiBaseUrl: 'http://localhost:3000',
    });
    uploadCheckImage = new UploadCheckImageUseCase(
      unitOfWork,
      checks,
      storedFiles,
      fileStorage,
      branches,
      audit,
    );
    getCheckImage = new GetCheckImageUseCase(checks, storedFiles, fileStorage, branches);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (storageRoot) {
      await rm(storageRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  async function seedContext() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    return { tenant, branch, staff };
  }

  it('returns timeline after check lifecycle events', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `TRK-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملت',
      amountRial: 9_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    await transferCheck.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      transferredTo: 'تأمین‌کننده A',
      transferReason: 'واگذاری',
      staffContext: staffContext(branch.id, staff.id),
    });

    const tracking = await getCheckTracking.execute({
      tenantId: tenant.id,
      checkId: registered.check.id,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(tracking.checkId).toBe(registered.check.id);
    expect(tracking.timeline.some((e) => e.action === 'check.register')).toBe(true);
    expect(tracking.timeline.some((e) => e.action === 'check.transfer')).toBe(true);
  });

  it('adds follow-up tracking note with audit', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `NOTE-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'صادرات',
      amountRial: 5_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'رضا محمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    const result = await addCheckTrackingNote.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      body: 'تماس با بانک',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.note.body).toBe('تماس با بانک');

    const tracking = await getCheckTracking.execute({
      tenantId: tenant.id,
      checkId: registered.check.id,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(tracking.followUpNotes.some((n) => n.id === result.note.id)).toBe(true);
    expect(tracking.timeline.some((e) => e.action === 'check.tracking.note')).toBe(true);
  });

  it('uploads check scan and returns signed download URL', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `IMG-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملی',
      amountRial: 3_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'کاربر تست',
      staffContext: staffContext(branch.id, staff.id),
    });

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const uploaded = await uploadCheckImage.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      fileBuffer: pngBuffer,
      originalFileName: 'scan.png',
      mimeType: 'image/png',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(uploaded.mimeType).toBe('image/png');

    const checkRow = await prisma.check.findFirstOrThrow({
      where: { id: registered.check.id },
    });
    expect(checkRow.imageFileId).toBe(uploaded.imageFileId);

    const download = await getCheckImage.execute({
      tenantId: tenant.id,
      checkId: registered.check.id,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(download.url).toContain('/api/v1/files/signed-download?token=');
    expect(download.imageFileId).toBe(uploaded.imageFileId);

    const stored = await storedFiles.findById(tenant.id, uploaded.imageFileId);
    expect(stored?.storageKey).toContain(`/checks/${registered.check.id}/scan.png`);

    const absolutePath = fileStorage.resolveAbsolutePath(stored!.storageKey);
    const onDisk = await readFile(absolutePath);
    expect(onDisk.equals(pngBuffer)).toBe(true);
  });

  it('rejects invalid mime type on upload', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `BAD-MIME-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'پارسیان',
      amountRial: 2_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'کاربر تست',
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      uploadCheckImage.execute({
        tenantId: tenant.id,
        staffId: staff.id,
        checkId: registered.check.id,
        fileBuffer: Buffer.from('not-an-image'),
        originalFileName: 'bad.txt',
        mimeType: 'text/plain',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      httpStatus: 400,
    });
  });
});
