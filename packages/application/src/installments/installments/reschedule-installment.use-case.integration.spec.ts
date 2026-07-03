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

import { RescheduleInstallmentUseCase } from './reschedule-installment.use-case.js';

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

describeIfDb('RescheduleInstallmentUseCase (IFP-080 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new RescheduleInstallmentUseCase(
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

  async function seedPendingInstallment() {
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
        totalAmountRial: 3_000_000n,
        downPaymentRial: 0n,
        installmentCount: 1,
        firstDueDate: new Date('2026-12-01T12:00:00.000Z'),
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
        dueDate: new Date('2026-12-01T12:00:00.000Z'),
        amountRial: 3_000_000n,
        status: 'PENDING',
      },
    });

    return { tenant, branch, staff, sale, installment };
  }

  it('reschedules a pending installment and writes operation log', async () => {
    const { tenant, branch, staff, sale, installment } = await seedPendingInstallment();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      newDueDate: '2027-01-15',
      reason: 'توافق با مشتری',
      expectedVersion: installment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.installment.dueDate.toISOString()).toBe('2027-01-15T12:00:00.000Z');
    expect(result.installment.version).toBe(installment.version + 1);

    const log = await prisma.installmentOperationLog.findUniqueOrThrow({
      where: { id: result.operationLogId },
    });
    expect(log.operationType).toBe('reschedule');
    expect(log.saleId).toBe(sale.id);
    expect(log.installmentIds).toEqual([installment.id]);

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'installment.reschedule',
        entityId: installment.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects rescheduling a paid installment', async () => {
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
        newDueDate: '2027-02-01',
        expectedVersion: paid.version,
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
        newDueDate: '2027-02-01',
        expectedVersion: installment.version + 5,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      httpStatus: 409,
    });
  });

  it('returns not found for cross-tenant installment id', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const otherTenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });

    await expect(
      useCase.execute({
        tenantId: otherTenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        newDueDate: '2027-02-01',
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
