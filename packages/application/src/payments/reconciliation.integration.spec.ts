import { randomUUID } from 'node:crypto';

import {
  CreateSettlementBatchUseCase,
  ResolveDiscrepancyUseCase,
  RunReconciliationUseCase,
} from '@hivork/application';
import { parseJalaliDateToIso } from '@hivork/i18n';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaReconciliationRepository,
  PrismaService,
  PrismaSettlementBatchRepository,
  PrismaTenantSequenceRepository,
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

describeIfDb('Reconciliation (IFP-110 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const settlements = new PrismaSettlementBatchRepository(prisma);
  const reconciliations = new PrismaReconciliationRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const sequences = new PrismaTenantSequenceRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const createSettlement = new CreateSettlementBatchUseCase(
    unitOfWork,
    settlements,
    branches,
    sequences,
    audit,
  );
  const runReconciliation = new RunReconciliationUseCase(
    unitOfWork,
    settlements,
    reconciliations,
  );
  const resolveDiscrepancy = new ResolveDiscrepancyUseCase(
    unitOfWork,
    reconciliations,
    settlements,
    audit,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedClosedSettlementBatch() {
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
        totalAmountRial: 15_000_000n,
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
        amountRial: 15_000_000n,
        status: 'PENDING',
      },
    });

    const occurredIso = parseJalaliDateToIso('1405/07/15');
    if (!occurredIso) {
      throw new Error('Invalid jalali test date');
    }
    const occurredAt = new Date(`${occurredIso}T10:00:00.000Z`);

    const attempt = await prisma.paymentAttempt.create({
      data: {
        tenantId: tenant.id,
        installmentId: installment.id,
        amountRial: 5_000_000n,
        status: 'CONFIRMED',
        reportedByType: 'STAFF',
        reportedById: staff.id,
        confirmedByStaffId: staff.id,
        confirmedAt: new Date(),
        idempotencyKey: randomUUID(),
        metadata: { method: 'pos', traceNumber: 'TRACE-MATCH' },
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const matchedEntry = await prisma.paymentLedgerEntry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial: 5_000_000n,
        status: 'POSTED',
        occurredAt,
        paymentMethod: 'pos',
        saleId: sale.id,
        installmentId: installment.id,
        paymentAttemptId: attempt.id,
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const unmatchedEntry = await prisma.paymentLedgerEntry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial: 3_000_000n,
        status: 'POSTED',
        occurredAt,
        paymentMethod: 'online',
        saleId: sale.id,
        installmentId: installment.id,
        metadata: { referenceNumber: 'ONLINE-ONLY' },
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const created = await createSettlement.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      periodFrom: '1405-07-01',
      periodTo: '1405-07-31',
      paymentMethods: ['card', 'online'],
      staffContext: staffContext(branch.id, staff.id),
    });

    const batch = await prisma.settlementBatch.findFirstOrThrow({
      where: { id: created.settlement.id },
    });

    await prisma.settlementBatch.update({
      where: { id: batch.id },
      data: { status: 'CLOSED', closedAt: new Date(), closedById: staff.id },
    });

    return {
      tenant,
      branch,
      staff,
      batchId: batch.id,
      matchedEntry,
      unmatchedEntry,
    };
  }

  it('reconciles bank CSV and reports two discrepancies', async () => {
    const { tenant, branch, staff, batchId } = await seedClosedSettlementBatch();

    const result = await runReconciliation.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      settlementBatchId: batchId,
      bankRows: [
        { reference: 'TRACE-MATCH', amountRial: 5_000_000n },
        { reference: 'BANK-ONLY', amountRial: 1_000_000n },
      ],
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.report.matchedCount).toBe(1);
    expect(result.report.discrepancyCount).toBe(2);
    expect(result.report.bankTotalRial).toBe('6000000');
    expect(result.report.systemTotalRial).toBe('8000000');

    const types = result.discrepancies.map((item) => item.discrepancyType).sort();
    expect(types).toEqual(['missing_in_bank', 'missing_in_system']);
  });

  it('resolves discrepancy with audit', async () => {
    const { tenant, branch, staff, batchId } = await seedClosedSettlementBatch();

    const reconciled = await runReconciliation.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      settlementBatchId: batchId,
      bankRows: [{ reference: 'TRACE-MATCH', amountRial: 5_000_000n }],
      staffContext: staffContext(branch.id, staff.id),
    });

    const openDiscrepancy = reconciled.discrepancies.find(
      (item) => item.discrepancyType === 'missing_in_bank',
    );
    expect(openDiscrepancy).toBeTruthy();

    const resolved = await resolveDiscrepancy.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      discrepancyId: openDiscrepancy!.id,
      resolveNote: 'ثبت در سیستم تأیید شد — مغایرت بانکی',
      expectedVersion: openDiscrepancy!.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(resolved.discrepancy.status).toBe('resolved');
    expect(resolved.discrepancy.resolveNote).toBe('ثبت در سیستم تأیید شد — مغایرت بانکی');

    const auditRows = await audit.find({
      tenantId: tenant.id,
      action: 'reconciliation.resolve',
      entityType: 'ReconciliationDiscrepancy',
      limit: 5,
    });
    expect(auditRows.some((row) => row.entityId === openDiscrepancy!.id)).toBe(true);
  });
});
