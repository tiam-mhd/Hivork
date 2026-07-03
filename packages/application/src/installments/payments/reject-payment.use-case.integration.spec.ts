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
import { RejectPaymentUseCase } from './reject-payment.use-case.js';

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

describeIfDb('RejectPaymentUseCase (IFP-093 integration)', () => {
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
  const rejectPayment = new RejectPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
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

  it('rejects pending payment without changing installment', async () => {
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
    const installmentBefore = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });

    const result = await rejectPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: recorded.paymentAttempt.id,
      rejectedReason: 'رسید ارسالی با مبلغ ثبت‌شده مطابقت ندارد',
      expectedVersion: attemptRow.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.paymentAttempt.status).toBe('rejected');
    expect(result.paymentAttempt.rejectedReason).toBe(
      'رسید ارسالی با مبلغ ثبت‌شده مطابقت ندارد',
    );

    const installmentAfter = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });
    expect(installmentAfter.status).toBe(installmentBefore.status);
    expect(installmentAfter.version).toBe(installmentBefore.version);
    expect(installmentAfter.paidAt).toEqual(installmentBefore.paidAt);

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'payment.reject',
        entityId: recorded.paymentAttempt.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('blocks reject on already confirmed payment', async () => {
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

    await confirmPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: recorded.paymentAttempt.id,
      expectedAttemptVersion: attemptRow.version,
      expectedInstallmentVersion: installmentRow.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      rejectPayment.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        paymentAttemptId: recorded.paymentAttempt.id,
        rejectedReason: 'تلاش برای رد پرداخت تأییدشده',
        expectedVersion: attemptRow.version + 1,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_ALREADY_CONFIRMED',
      httpStatus: 409,
    });
  });
});
