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

import { ConfirmPaymentUseCase } from '../payments/confirm-payment.use-case.js';
import { RecordCashManualPaymentUseCase } from '../payments/record-cash-manual-payment.use-case.js';
import { WaiveInstallmentUseCase } from './waive-installment.use-case.js';

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

describeIfDb('WaiveInstallmentUseCase (IFP-096 integration)', () => {
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
  const waiveInstallment = new WaiveInstallmentUseCase(
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

    return { tenant, branch, staff, sale, installment };
  }

  it('waives pending installment and syncs sale remaining', async () => {
    const { tenant, branch, staff, sale, installment } = await seedPendingInstallment();

    const result = await waiveInstallment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      waiveReason: 'توافق مدیریت — بخشودگی قسط آخر',
      expectedVersion: installment.version,
      rejectPendingPayments: true,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.installment.status).toBe('waived');
    expect(result.installment.waiveReason).toBe('توافق مدیریت — بخشودگی قسط آخر');
    expect(result.remainingRial).toBe('0');

    const updated = await prisma.installment.findUniqueOrThrow({ where: { id: installment.id } });
    expect(updated.status).toBe('WAIVED');
    expect(updated.waivedByStaffId).toBe(staff.id);

    const updatedSale = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id } });
    expect(updatedSale.metadata).toMatchObject({ remainingRial: '0' });

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'installment.waive',
        entityId: installment.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects waive on paid installment', async () => {
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

    const paidInstallment = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });

    await expect(
      waiveInstallment.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        waiveReason: 'تلاش برای بخشودگی قسط پرداخت‌شده',
        expectedVersion: paidInstallment.version,
        rejectPendingPayments: true,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_ALREADY_PAID',
      httpStatus: 409,
    });
  });

  it('auto-rejects pending payments when rejectPendingPayments is true', async () => {
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

    const installmentRow = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });

    const result = await waiveInstallment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      waiveReason: 'بخشودگی با رد پرداخت در انتظار',
      expectedVersion: installmentRow.version,
      rejectPendingPayments: true,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.rejectedPaymentAttemptIds).toContain(recorded.paymentAttempt.id);

    const attempt = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: recorded.paymentAttempt.id },
    });
    expect(attempt.status).toBe('REJECTED');
  });
});
