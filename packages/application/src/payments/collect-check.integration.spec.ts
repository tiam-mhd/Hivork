import {
  CollectCheckUseCase,
  RegisterReceivedCheckUseCase,
  TransferCheckUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaCheckRepository,
  PrismaInstallmentRepository,
  PrismaPaymentAttemptRepository,
  PrismaPaymentLedgerRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

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

describeIfDb('CollectCheckUseCase + TransferCheckUseCase (IFP-115 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const checks = new PrismaCheckRepository(prisma);
  const ledger = new PrismaPaymentLedgerRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const registerReceivedCheck = new RegisterReceivedCheckUseCase(
    unitOfWork,
    checks,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
  );
  const collectCheck = new CollectCheckUseCase(
    unitOfWork,
    checks,
    ledger,
    installments,
    paymentAttempts,
    branches,
    audit,
  );
  const transferCheck = new TransferCheckUseCase(unitOfWork, checks, branches, audit);

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

  it('collects check → ledger CREDIT + installment paid', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();
    const checkNumber = `RCV-COLLECT-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملت',
      amountRial: installment.amountRial,
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      installmentId: installment.id,
      staffContext: staffContext(branch.id, staff.id),
    });

    const idempotencyKey = crypto.randomUUID();
    const result = await collectCheck.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      bankDepositRef: 'DEP-12345',
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.check.status).toBe('collected');
    expect(result.ledgerEntryId).toBeTruthy();
    expect(result.installment?.status).toBe('paid');
    expect(result.idempotentReplay).toBe(false);

    const ledgerRow = await prisma.paymentLedgerEntry.findFirstOrThrow({
      where: { id: result.ledgerEntryId!, tenantId: tenant.id },
    });
    expect(ledgerRow.direction).toBe('CREDIT');
    expect(ledgerRow.entryType).toBe('PAYMENT_IN');
    expect(ledgerRow.paymentMethod).toBe('check');
    expect(ledgerRow.checkId).toBe(registered.check.id);
    expect(ledgerRow.amountRial).toBe(installment.amountRial);

    const installmentRow = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id },
    });
    expect(installmentRow.status).toBe('PAID');
    expect(installmentRow.paidAt).toBeTruthy();

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'check.collect',
        entityId: registered.check.id,
      },
    });
    expect(auditRow).toBeTruthy();
  });

  it('returns same response for duplicate Idempotency-Key', async () => {
    const { tenant, branch, staff } = await seedPendingInstallment();
    const checkNumber = `RCV-IDEM-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'صادرات',
      amountRial: 10_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'رضا محمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    const idempotencyKey = crypto.randomUUID();
    const first = await collectCheck.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    const second = await collectCheck.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.check.id).toBe(first.check.id);
    expect(second.ledgerEntryId).toBe(first.ledgerEntryId);

    const ledgerCount = await prisma.paymentLedgerEntry.count({
      where: { checkId: registered.check.id, tenantId: tenant.id },
    });
    expect(ledgerCount).toBe(1);
  });

  it('transfers a registered check', async () => {
    const { tenant, branch, staff } = await seedPendingInstallment();
    const checkNumber = `RCV-XFER-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملی',
      amountRial: 7_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'کاربر تست',
      staffContext: staffContext(branch.id, staff.id),
    });

    const result = await transferCheck.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      transferredTo: 'علی رضایی',
      transferReason: 'واگذاری به تأمین‌کننده',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.check.status).toBe('transferred');

    const row = await prisma.check.findFirstOrThrow({
      where: { id: registered.check.id },
    });
    expect(row.status).toBe('TRANSFERRED');
    expect(row.transferredTo).toBe('علی رضایی');

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'check.transfer',
        entityId: registered.check.id,
      },
    });
    expect(auditRow).toBeTruthy();
  });

  it('rejects transfer after collect', async () => {
    const { tenant, branch, staff } = await seedPendingInstallment();
    const checkNumber = `RCV-XFER-BLOCK-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'پارسیان',
      amountRial: 4_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'کاربر تست',
      staffContext: staffContext(branch.id, staff.id),
    });

    await collectCheck.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      idempotencyKey: crypto.randomUUID(),
      confirmInstallment: false,
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      transferCheck.execute({
        tenantId: tenant.id,
        staffId: staff.id,
        checkId: registered.check.id,
        transferredTo: 'Someone',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'CHECK_ALREADY_COLLECTED',
      httpStatus: 409,
    });
  });
});
