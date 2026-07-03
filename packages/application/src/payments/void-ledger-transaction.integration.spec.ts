import { randomUUID } from 'node:crypto';

import { VoidLedgerTransactionUseCase } from '@hivork/application';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
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

describeIfDb('VoidLedgerTransactionUseCase (IFP-108 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const ledger = new PrismaPaymentLedgerRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const useCase = new VoidLedgerTransactionUseCase(
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

  async function seedPostedLedgerEntry(options?: {
    amountRial?: bigint;
    withConfirmedAttempt?: boolean;
  }) {
    const amountRial = options?.amountRial ?? 5_000_000n;
    const withConfirmedAttempt = options?.withConfirmedAttempt ?? false;

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
        status: withConfirmedAttempt ? 'PAID' : 'PENDING',
        paidAt: withConfirmedAttempt ? new Date('2026-07-02T10:00:00.000Z') : null,
        confirmedByStaffId: withConfirmedAttempt ? staff.id : null,
        metadata: withConfirmedAttempt ? { paidRial: amountRial.toString() } : undefined,
      },
    });

    let paymentAttempt: { id: string; version: number } | null = null;

    if (withConfirmedAttempt) {
      const attempt = await prisma.paymentAttempt.create({
        data: {
          tenantId: tenant.id,
          installmentId: installment.id,
          amountRial,
          status: 'CONFIRMED',
          reportedByType: 'STAFF',
          reportedById: staff.id,
          confirmedByStaffId: staff.id,
          confirmedAt: new Date(),
          idempotencyKey: randomUUID(),
          createdById: staff.id,
          updatedById: staff.id,
        },
      });
      paymentAttempt = { id: attempt.id, version: attempt.version };
    }

    const paymentIn = await prisma.paymentLedgerEntry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial,
        status: 'POSTED',
        occurredAt: new Date('2026-07-02T10:00:00.000Z'),
        paymentMethod: 'cash',
        saleId: sale.id,
        installmentId: installment.id,
        paymentAttemptId: paymentAttempt?.id ?? null,
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    return {
      tenant,
      branch,
      staff,
      sale,
      installment,
      paymentIn,
      paymentAttempt,
      amountRial,
    };
  }

  it('void creates reversal pair and marks original voided', async () => {
    const { tenant, branch, staff, paymentIn, amountRial } = await seedPostedLedgerEntry();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      ledgerEntryId: paymentIn.id,
      voidReason: 'ثبت تکراری در ledger',
      expectedVersion: paymentIn.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.originalEntry).toEqual({ id: paymentIn.id, status: 'voided' });
    expect(result.reversalEntry.entryType).toBe('payment_in');
    expect(result.reversalEntry.direction).toBe('debit');
    expect(result.reversalEntry.amountRial).toBe(amountRial.toString());
    expect(result.reversalEntry.status).toBe('posted');

    const originalRow = await prisma.paymentLedgerEntry.findFirstOrThrow({
      where: { id: paymentIn.id },
    });
    expect(originalRow.status).toBe('VOIDED');
    expect(originalRow.voidReason).toBe('ثبت تکراری در ledger');

    const reversalRow = await prisma.paymentLedgerEntry.findFirstOrThrow({
      where: { id: result.reversalEntry.id },
    });
    expect(reversalRow.reversesEntryId).toBe(paymentIn.id);
    expect(reversalRow.direction).toBe('DEBIT');
    expect(reversalRow.status).toBe('POSTED');

    const auditRows = await audit.find({
      tenantId: tenant.id,
      action: 'payment.void',
      entityType: 'PaymentLedgerEntry',
      limit: 5,
    });
    expect(auditRows.some((row) => row.entityId === paymentIn.id)).toBe(true);
  });

  it('rejects double void with 409', async () => {
    const { tenant, branch, staff, paymentIn } = await seedPostedLedgerEntry();

    await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      ledgerEntryId: paymentIn.id,
      voidReason: 'اولین ابطال',
      expectedVersion: paymentIn.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    const voidedRow = await prisma.paymentLedgerEntry.findFirstOrThrow({
      where: { id: paymentIn.id },
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        ledgerEntryId: paymentIn.id,
        voidReason: 'تلاش دوباره',
        expectedVersion: voidedRow.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'LEDGER_ALREADY_VOIDED',
      httpStatus: 409,
    });
  });

  it('chains payment void when linked attempt is confirmed', async () => {
    const { tenant, branch, staff, installment, paymentIn, paymentAttempt } =
      await seedPostedLedgerEntry({ withConfirmedAttempt: true });

    expect(paymentAttempt).toBeTruthy();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      ledgerEntryId: paymentIn.id,
      voidReason: 'ابطال ledger و پرداخت همزمان',
      expectedVersion: paymentIn.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.paymentAttemptVoided).toBe(true);

    const voidedAttempt = await prisma.paymentAttempt.findFirstOrThrow({
      where: { id: paymentAttempt!.id },
    });
    expect(voidedAttempt.status).toBe('VOIDED');

    const revertedInstallment = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id },
    });
    expect(revertedInstallment.status).toBe('PENDING');
    expect(revertedInstallment.paidAt).toBeNull();
  });
});
