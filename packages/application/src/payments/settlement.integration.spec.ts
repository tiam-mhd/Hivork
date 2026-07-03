import {
  CloseSettlementBatchUseCase,
  CreateSettlementBatchUseCase,
  VoidLedgerTransactionUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaPaymentLedgerRepository,
  PrismaService,
  PrismaSettlementBatchRepository,
  PrismaTenantSequenceRepository,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { parseJalaliDateToIso } from '@hivork/i18n';
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
    await probe.$disconnect().catch(() => {});
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

describeIfDb('Settlement batches (IFP-109 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const settlements = new PrismaSettlementBatchRepository(prisma);
  const ledger = new PrismaPaymentLedgerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const sequences = new PrismaTenantSequenceRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const createSettlement = new CreateSettlementBatchUseCase(
    unitOfWork,
    settlements,
    branches,
    sequences,
    audit,
  );
  const closeSettlement = new CloseSettlementBatchUseCase(
    unitOfWork,
    settlements,
    paymentAttempts,
    audit,
  );
  const voidLedger = new VoidLedgerTransactionUseCase(
    unitOfWork,
    ledger,
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

  async function seedPosAndOnlineEntries() {
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
        totalAmountRial: 20_000_000n,
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
        amountRial: 20_000_000n,
        status: 'PENDING',
      },
    });

    const posAmount = 7_000_000n;
    const onlineAmount = 3_000_000n;
    const occurredIso = parseJalaliDateToIso('1405/07/15');
    if (!occurredIso) {
      throw new Error('Invalid jalali test date');
    }
    const occurredAt = new Date(`${occurredIso}T10:00:00.000Z`);

    const posEntry = await prisma.paymentLedgerEntry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial: posAmount,
        status: 'POSTED',
        occurredAt,
        paymentMethod: 'pos',
        saleId: sale.id,
        installmentId: installment.id,
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const onlineEntry = await prisma.paymentLedgerEntry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial: onlineAmount,
        status: 'POSTED',
        occurredAt,
        paymentMethod: 'online',
        saleId: sale.id,
        installmentId: installment.id,
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    return {
      tenant,
      branch,
      staff,
      posEntry,
      onlineEntry,
      expectedTotal: posAmount + onlineAmount,
    };
  }

  it('creates batch with eligible entries and correct total', async () => {
    const { tenant, branch, staff, expectedTotal } = await seedPosAndOnlineEntries();

    const result = await createSettlement.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      periodFrom: '1405-07-01',
      periodTo: '1405-07-31',
      paymentMethods: ['card', 'online'],
      note: 'تسویه تیر ۱۴۰۵',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.settlement.status).toBe('open');
    expect(result.settlement.entryCount).toBe(2);
    expect(result.settlement.totalAmountRial).toBe(expectedTotal.toString());
    expect(result.settlement.batchNumber).toMatch(/^STL-\d{6}-\d{3}$/);

    const auditRows = await audit.find({
      tenantId: tenant.id,
      action: 'settlement.create',
      entityType: 'SettlementBatch',
      limit: 5,
    });
    expect(auditRows.some((row) => row.entityId === result.settlement.id)).toBe(true);
  });

  it('blocks void on entries included in settlement batch', async () => {
    const { tenant, branch, staff, posEntry } = await seedPosAndOnlineEntries();

    await createSettlement.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      periodFrom: '1405-07-01',
      periodTo: '1405-07-31',
      paymentMethods: ['card', 'online'],
      staffContext: staffContext(branch.id, staff.id),
    });

    const batch = await prisma.settlementBatch.findFirstOrThrow({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    await closeSettlement.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      settlementBatchId: batch.id,
      expectedVersion: batch.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      voidLedger.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        ledgerEntryId: posEntry.id,
        voidReason: 'تلاش برای ابطال پس از تسویه',
        expectedVersion: posEntry.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'SETTLEMENT_LOCKED',
      httpStatus: 409,
    });
  });

  it('rejects empty settlement period', async () => {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    await expect(
      createSettlement.execute({
        tenantId: tenant.id,
        staffId: staff.id,
        branchId: branch.id,
        periodFrom: '1405-01-01',
        periodTo: '1405-01-31',
        paymentMethods: ['card'],
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'SETTLEMENT_EMPTY',
      httpStatus: 400,
    });
  });
});
