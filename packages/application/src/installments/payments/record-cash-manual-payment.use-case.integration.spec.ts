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

describeIfDb('RecordCashManualPaymentUseCase (IFP-087 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new RecordCashManualPaymentUseCase(
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

  async function seedPendingInstallment(amountRial = 5_000_000n) {
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

  it('records cash payment as pending attempt', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: installment.amountRial,
      note: 'دریافت نقدی در شعبه مرکزی',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.paymentAttempt.status).toBe('pending');
    expect(result.paymentAttempt.method).toBe('cash');
    expect(result.paymentAttempt.amountRial).toBe(installment.amountRial);

    const row = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: result.paymentAttempt.id },
    });
    expect(row.status).toBe('PENDING');

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'payment.report',
        entityId: result.paymentAttempt.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();

    const outbox = await prisma.outboxEvent.findFirst({
      where: {
        tenantId: tenant.id,
        eventType: 'payment.reported',
        aggregateId: result.paymentAttempt.id,
      },
    });
    expect(outbox).toBeTruthy();
  });

  it('returns same attempt on idempotent retry', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();
    const idempotencyKey = crypto.randomUUID();

    const first = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: installment.amountRial,
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    const second = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: installment.amountRial,
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.paymentAttempt.id).toBe(first.paymentAttempt.id);

    const count = await prisma.paymentAttempt.count({
      where: { tenantId: tenant.id, idempotencyKey },
    });
    expect(count).toBe(1);
  });

  it('rejects payment on paid installment', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        method: 'cash',
        amountRial: installment.amountRial,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_ALREADY_PAID',
      httpStatus: 409,
    });
  });
});
