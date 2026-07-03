import {
  ListChecksUseCase,
  RegisterReceivedCheckUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaCheckRepository,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { RecordCheckPaymentUseCase } from '../installments/payments/record-check-payment.use-case.js';

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

describeIfDb('RegisterReceivedCheckUseCase (IFP-113 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const checks = new PrismaCheckRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const registerReceivedCheck = new RegisterReceivedCheckUseCase(
    unitOfWork,
    checks,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
  );
  const listChecks = new ListChecksUseCase(checks);
  const recordCheckPayment = new RecordCheckPaymentUseCase(
    unitOfWork,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
    outbox,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPendingInstallment(amountRial = 20_000_000n) {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    const customer = await prisma.tenantCustomer.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    const sale = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: customer.id,
        createdByStaffId: staff.id,
        totalAmountRial: amountRial,
        downPaymentRial: 0n,
        installmentCount: 1,
        firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'ACTIVE',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const installment = await prisma.installment.create({
      data: {
        tenantId: tenant.id,
        saleId: sale.id,
        sequenceNumber: 1,
        dueDate: new Date('2026-10-01T12:00:00.000Z'),
        amountRial,
        status: 'PENDING',
      },
    });

    return { tenant, branch, staff, installment };
  }

  it('registers a standalone received check', async () => {
    const { tenant, branch, staff } = await seedPendingInstallment();
    const checkNumber = `RCV-STANDALONE-${Date.now()}`;

    const result = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملت',
      amountRial: 15_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.check.checkType).toBe('received');
    expect(result.check.status).toBe('registered');
    expect(result.check.checkNumber).toBe(checkNumber);
    expect(result.check.amountRial).toBe('15000000');

    const row = await prisma.check.findFirstOrThrow({
      where: { id: result.check.id, tenantId: tenant.id },
    });
    expect(row.checkType).toBe('RECEIVED');
    expect(row.status).toBe('REGISTERED');

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'check.register',
        entityId: result.check.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeTruthy();
  });

  it('promotes payment attempt metadata to a full check row', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();
    const checkNumber = `RCV-LINK-${Date.now()}`;

    const reported = await recordCheckPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      checkNumber,
      bankName: 'صادرات',
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      sayadId: '1234567890123456',
      note: 'چک بابت قسط ۳',
      staffContext: staffContext(branch.id, staff.id),
    });

    const metadataCheckId = reported.paymentAttempt.methodDetails?.checkId;
    expect(typeof metadataCheckId).toBe('string');

    const result = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'صادرات',
      amountRial: installment.amountRial,
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      sayadId: '1234567890123456',
      installmentId: installment.id,
      paymentAttemptId: reported.paymentAttempt.id,
      note: 'چک بابت قسط ۳',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.check.id).toBe(metadataCheckId);

    const attempt = await prisma.paymentAttempt.findFirstOrThrow({
      where: { id: reported.paymentAttempt.id },
    });
    const metadata = attempt.metadata as Record<string, unknown>;
    expect(metadata.checkPendingRegistration).toBe(false);
    expect(metadata.registeredCheckId).toBe(result.check.id);
  });

  it('lists received checks with status filter', async () => {
    const { tenant, branch, staff } = await seedPendingInstallment();
    const checkNumber = `RCV-LIST-${Date.now()}`;

    await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملی',
      amountRial: 8_000_000n,
      dueDate: '1405-12-15',
      drawerName: 'کاربر تست',
      staffContext: staffContext(branch.id, staff.id),
    });

    const list = await listChecks.execute({
      tenantId: tenant.id,
      staffContext: staffContext(branch.id, staff.id),
      checkType: 'received',
      status: 'registered',
      limit: 20,
      activeBranchId: branch.id,
    });

    expect(list.items.some((item) => item.checkNumber === checkNumber)).toBe(true);
  });

  it('rejects duplicate check number in checks table', async () => {
    const { tenant, branch, staff } = await seedPendingInstallment();
    const checkNumber = `RCV-DUP-${Date.now()}`;

    await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'پارسیان',
      amountRial: 5_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'رضا محمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      registerReceivedCheck.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        checkNumber,
        bankName: 'پارسیان',
        amountRial: 5_000_000n,
        dueDate: '1405-12-01',
        drawerName: 'رضا محمدی',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'CHECK_NUMBER_DUPLICATE',
      httpStatus: 409,
    });
  });

  it('rejects payment attempt that is not a check method', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const attempt = await prisma.paymentAttempt.create({
      data: {
        tenantId: tenant.id,
        installmentId: installment.id,
        reportedByType: 'STAFF',
        reportedById: staff.id,
        amountRial: installment.amountRial,
        status: 'PENDING',
        metadata: { method: 'cash' },
        createdById: staff.id,
      },
    });

    await expect(
      registerReceivedCheck.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        checkNumber: `RCV-BAD-${Date.now()}`,
        bankName: 'ملت',
        amountRial: installment.amountRial,
        dueDate: '1405-12-01',
        drawerName: 'علی احمدی',
        paymentAttemptId: attempt.id,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_METHOD_MISMATCH',
      httpStatus: 400,
    });
  });
});
