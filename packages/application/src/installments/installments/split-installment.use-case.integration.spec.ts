import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentOperationLogRepository,
  PrismaInstallmentRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { SplitInstallmentUseCase } from './split-installment.use-case.js';

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

describeIfDb('SplitInstallmentUseCase (IFP-085 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new SplitInstallmentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaInstallmentOperationLogRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPendingInstallment(amountRial = 5_000_000n, sequenceNumber = 5) {
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
        sequenceNumber,
        dueDate: new Date('2026-10-01T12:00:00.000Z'),
        amountRial,
        status: 'PENDING',
      },
    });

    return { tenant, branch, staff, sale, installment };
  }

  it('splits an installment with explicit parts and preserves total', async () => {
    const { tenant, branch, staff, sale, installment } = await seedPendingInstallment();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      reason: 'تقسیم قسط به دو بخش',
      expectedVersion: installment.version,
      parts: [
        { amountRial: '3000000', dueDate: '2026-11-01' },
        { amountRial: '2000000', dueDate: '2026-12-01' },
      ],
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.originalInstallmentId).toBe(installment.id);
    expect(result.newInstallments).toHaveLength(2);
    expect(result.newInstallments[0]!.sequenceNumber).toBe(installment.sequenceNumber);
    expect(result.newInstallments[1]!.sequenceNumber).toBe(installment.sequenceNumber + 1);

    const total = result.newInstallments.reduce((sum, item) => sum + item.amountRial, 0n);
    expect(total).toBe(installment.amountRial);

    const deleted = await prisma.installment.findUnique({ where: { id: installment.id } });
    expect(deleted?.deletedAt).toBeTruthy();

    const log = await prisma.installmentOperationLog.findUniqueOrThrow({
      where: { id: result.operationLogId },
    });
    expect(log.operationType).toBe('split');
    expect(log.saleId).toBe(sale.id);

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'installment.split',
        entityId: sale.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects split on paid installment', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'PAID', paidAt: new Date(), version: { increment: 1 } },
    });

    const paid = await prisma.installment.findUniqueOrThrow({ where: { id: installment.id } });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        reason: 'تقسیم قسط',
        expectedVersion: paid.version,
        parts: [
          { amountRial: '2500000', dueDate: '2026-11-01' },
          { amountRial: '2500000', dueDate: '2026-12-01' },
        ],
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_STATUS_INVALID',
      httpStatus: 409,
    });
  });

  it('returns version conflict when expectedVersion is stale', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        reason: 'تقسیم قسط',
        expectedVersion: installment.version + 5,
        parts: [
          { amountRial: '3000000', dueDate: '2026-11-01' },
          { amountRial: '2000000', dueDate: '2026-12-01' },
        ],
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      httpStatus: 409,
    });
  });
});
