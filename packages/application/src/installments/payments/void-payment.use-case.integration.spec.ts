import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { ConfirmPaymentUseCase } from './confirm-payment.use-case.js';
import { RecordCashManualPaymentUseCase } from './record-cash-manual-payment.use-case.js';
import { VoidPaymentUseCase } from './void-payment.use-case.js';

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

describeIfDb('VoidPaymentUseCase (IFP-094 integration)', () => {
  const prisma = new PrismaService();
  const recordPayment = new RecordCashManualPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );
  const confirmPayment = new ConfirmPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );
  const voidPayment = new VoidPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPendingInstallment(amountRial = 10_000_000n) {
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

  async function confirmFullPayment(
    tenantId: string,
    branchId: string,
    staffId: string,
    installmentId: string,
    amountRial: bigint,
  ) {
    const recorded = await recordPayment.execute({
      tenantId,
      branchId,
      staffId,
      installmentId,
      method: 'cash',
      amountRial,
      staffContext: staffContext(branchId, staffId),
    });

    const attemptRow = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: recorded.paymentAttempt.id },
    });
    const installmentRow = await prisma.installment.findUniqueOrThrow({
      where: { id: installmentId },
    });

    await confirmPayment.execute({
      tenantId,
      branchId,
      staffId,
      paymentAttemptId: recorded.paymentAttempt.id,
      expectedAttemptVersion: attemptRow.version,
      expectedInstallmentVersion: installmentRow.version,
      staffContext: staffContext(branchId, staffId),
    });

    const confirmedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: recorded.paymentAttempt.id },
    });
    const paidInstallment = await prisma.installment.findUniqueOrThrow({
      where: { id: installmentId },
    });

    return { attempt: confirmedAttempt, installment: paidInstallment };
  }

  it('voids confirmed payment and reverts installment to pending', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();
    const { attempt, installment: paidInstallment } = await confirmFullPayment(
      tenant.id,
      branch.id,
      staff.id,
      installment.id,
      installment.amountRial,
    );

    expect(paidInstallment.status).toBe('PAID');

    const result = await voidPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: attempt.id,
      voidReason: 'ثبت اشتباه — مبلغ تکراری',
      expectedAttemptVersion: attempt.version,
      expectedInstallmentVersion: paidInstallment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.paymentAttempt.status).toBe('voided');
    expect(result.paymentAttempt.voidReason).toBe('ثبت اشتباه — مبلغ تکراری');
    expect(result.installment.status).toBe('pending');
    expect(result.installment.paidAt).toBeNull();

    const voidedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    expect(voidedAttempt.status).toBe('VOIDED');
    expect(voidedAttempt.metadata).toMatchObject({
      voidReason: 'ثبت اشتباه — مبلغ تکراری',
      voidedByStaffId: staff.id,
    });

    const revertedInstallment = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });
    expect(revertedInstallment.status).toBe('PENDING');
    expect(revertedInstallment.paidAt).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'payment.void',
        entityId: attempt.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('blocks void outside void window', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();
    const { attempt, installment: paidInstallment } = await confirmFullPayment(
      tenant.id,
      branch.id,
      staff.id,
      installment.id,
      installment.amountRial,
    );

    const expiredConfirmedAt = new Date();
    expiredConfirmedAt.setDate(expiredConfirmedAt.getDate() - 10);

    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { confirmedAt: expiredConfirmedAt },
    });

    await expect(
      voidPayment.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        paymentAttemptId: attempt.id,
        voidReason: 'تلاش برای ابطال خارج از بازه',
        expectedAttemptVersion: attempt.version,
        expectedInstallmentVersion: paidInstallment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'VOID_WINDOW_EXPIRED',
      httpStatus: 403,
    });
  });

  it('blocks void on pending payment', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const recorded = await recordPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: installment.amountRial,
      staffContext: staffContext(branch.id, staff.id),
    });

    const attemptRow = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: recorded.paymentAttempt.id },
    });
    const installmentRow = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });

    await expect(
      voidPayment.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        paymentAttemptId: recorded.paymentAttempt.id,
        voidReason: 'تلاش برای ابطال پرداخت در انتظار',
        expectedAttemptVersion: attemptRow.version,
        expectedInstallmentVersion: installmentRow.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_NOT_CONFIRMED',
      httpStatus: 409,
    });
  });
});
