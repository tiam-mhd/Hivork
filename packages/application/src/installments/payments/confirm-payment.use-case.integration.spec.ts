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

describeIfDb('ConfirmPaymentUseCase (IFP-092 integration)', () => {
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

  it('confirms payment and marks installment paid', async () => {
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

    const result = await confirmPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: recorded.paymentAttempt.id,
      expectedAttemptVersion: attemptRow.version,
      expectedInstallmentVersion: installmentRow.version,
      note: 'رسید بانکی تطبیق شد',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.paymentAttempt.status).toBe('confirmed');
    expect(result.installment.status).toBe('paid');
    expect(result.installment.paidAt).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'payment.confirm',
        entityId: recorded.paymentAttempt.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('keeps installment pending on partial confirm', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment(10_000_000n);

    await prisma.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId: tenant.id,
          module: 'installments',
          key: 'payment_allow_partial',
        },
      },
      create: {
        tenantId: tenant.id,
        module: 'installments',
        key: 'payment_allow_partial',
        value: true,
        createdById: staff.id,
        updatedById: staff.id,
      },
      update: {
        value: true,
        updatedById: staff.id,
      },
    });

    const recorded = await recordPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: 4_000_000n,
      staffContext: staffContext(branch.id, staff.id),
    });

    const attemptRow = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: recorded.paymentAttempt.id },
    });
    const installmentRow = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });

    const result = await confirmPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: recorded.paymentAttempt.id,
      expectedAttemptVersion: attemptRow.version,
      expectedInstallmentVersion: installmentRow.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.installment.status).toBe('pending');

    const updatedInstallment = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });
    expect(updatedInstallment.metadata).toMatchObject({ paidRial: '4000000' });
  });

  it('blocks double confirm', async () => {
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
      confirmPayment.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        paymentAttemptId: recorded.paymentAttempt.id,
        expectedAttemptVersion: attemptRow.version,
        expectedInstallmentVersion: installmentRow.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_ALREADY_CONFIRMED',
      httpStatus: 409,
    });
  });
});
