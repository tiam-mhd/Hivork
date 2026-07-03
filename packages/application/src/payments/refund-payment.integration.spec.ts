import { randomUUID } from 'node:crypto';

import { RefundPaymentUseCase } from '@hivork/application';
import {
  MockPaymentGateway,
  MockPaymentGatewayRegistry,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaPaymentAttemptRepository,
  PrismaPaymentLedgerRepository,
  PrismaService,
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

describeIfDb('RefundPaymentUseCase (IFP-107 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const ledger = new PrismaPaymentLedgerRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const audit = new PrismaAuditService(prisma);
  const mockGateway = new MockPaymentGateway({
    webhookSecret: 'integration-secret',
    publicApiBaseUrl: 'http://localhost:4000',
    nodeEnv: 'test',
  });
  const gateways = new MockPaymentGatewayRegistry(new Map([[mockGateway.provider, mockGateway]]));

  const useCase = new RefundPaymentUseCase(
    unitOfWork,
    ledger,
    installments,
    paymentAttempts,
    branches,
    gateways,
    audit,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPaidInstallmentLedger(amountRial = 5_000_000n) {
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
        status: 'PAID',
        paidAt: new Date('2026-07-02T10:00:00.000Z'),
        metadata: { paidRial: amountRial.toString() },
      },
    });

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
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    return { tenant, branch, staff, sale, installment, paymentIn, amountRial };
  }

  it('creates REFUND entry and reverts installment on full refund', async () => {
    const { tenant, branch, staff, installment, paymentIn, amountRial } =
      await seedPaidInstallmentLedger();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      ledgerEntryId: paymentIn.id,
      refundAmountRial: amountRial,
      reason: 'استرداد کامل — اشتباه در مبلغ',
      idempotencyKey: randomUUID(),
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.refundEntry.entryType).toBe('refund');
    expect(result.refundEntry.direction).toBe('debit');
    expect(result.refundEntry.amountRial).toBe(amountRial.toString());
    expect(result.idempotentReplay).toBe(false);

    const refundRow = await prisma.paymentLedgerEntry.findFirstOrThrow({
      where: { id: result.refundEntry.id },
    });
    expect(refundRow.reversesEntryId).toBe(paymentIn.id);
    expect(refundRow.entryType).toBe('REFUND');

    const updatedInstallment = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id },
    });
    expect(updatedInstallment.status).toBe('PENDING');
    expect(updatedInstallment.paidAt).toBeNull();

    const auditRows = await audit.find({
      tenantId: tenant.id,
      action: 'payment.refund',
      entityType: 'PaymentLedgerEntry',
      limit: 5,
    });
    expect(auditRows.some((row) => row.entityId === result.refundEntry.id)).toBe(true);
  });

  it('supports partial refund without reverting paid status', async () => {
    const { tenant, branch, staff, installment, paymentIn, amountRial } =
      await seedPaidInstallmentLedger();

    const partial = amountRial / 2n;

    await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      ledgerEntryId: paymentIn.id,
      refundAmountRial: partial,
      reason: 'استرداد جزئی',
      staffContext: staffContext(branch.id, staff.id),
    });

    const updatedInstallment = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id },
    });
    expect(updatedInstallment.status).toBe('PENDING');
    expect(updatedInstallment.metadata).toMatchObject({
      paidRial: partial.toString(),
    });

    const priorRefunds = await ledger.sumPostedRefundsForEntry(tenant.id, paymentIn.id);
    expect(priorRefunds).toBe(partial);
  });

  it('rejects refund exceeding remaining balance', async () => {
    const { tenant, branch, staff, paymentIn, amountRial } = await seedPaidInstallmentLedger();

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        ledgerEntryId: paymentIn.id,
        refundAmountRial: amountRial + 1n,
        reason: 'بیش از حد',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'REFUND_AMOUNT_EXCEEDS',
      httpStatus: 400,
    });
  });
});
