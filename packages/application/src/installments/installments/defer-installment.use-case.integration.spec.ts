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

import { DeferInstallmentUseCase } from './defer-installment.use-case.js';

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

describeIfDb('DeferInstallmentUseCase (IFP-081 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new DeferInstallmentUseCase(
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

  async function seedInstallment(status: 'PENDING' | 'OVERDUE' = 'PENDING') {
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
        totalAmountRial: 2_000_000n,
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
        amountRial: 2_000_000n,
        status,
      },
    });

    return { tenant, branch, staff, sale, installment };
  }

  it('defers pending installment within max days', async () => {
    const { tenant, branch, staff, installment } = await seedInstallment();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      deferDays: 7,
      reason: 'درخواست مشتری',
      expectedVersion: installment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.previousDueDate.toISOString()).toBe('2026-12-01T12:00:00.000Z');
    expect(result.installment.dueDate.toISOString()).toBe('2026-12-08T12:00:00.000Z');
    expect(result.installment.version).toBe(installment.version + 1);

    const log = await prisma.installmentOperationLog.findUniqueOrThrow({
      where: { id: result.operationLogId },
    });
    expect(log.operationType).toBe('defer');
    expect(log.metadata).toMatchObject({
      deferHistory: [
        expect.objectContaining({
          deferDays: 7,
          previousDueDate: '2026-12-01T12:00:00.000Z',
          newDueDate: '2026-12-08T12:00:00.000Z',
        }),
      ],
    });
  });

  it('blocks defer when deferDays exceeds tenant max', async () => {
    const { tenant, branch, staff, installment } = await seedInstallment();

    await prisma.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId: tenant.id,
          module: 'installments',
          key: 'defer_max_days',
        },
      },
      create: {
        tenantId: tenant.id,
        module: 'installments',
        key: 'defer_max_days',
        value: 5,
        updatedById: staff.id,
      },
      update: {
        value: 5,
        updatedById: staff.id,
      },
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        deferDays: 7,
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'DEFER_MAX_EXCEEDED',
      httpStatus: 400,
    });
  });

  it('rejects defer for overdue installment', async () => {
    const { tenant, branch, staff, installment } = await seedInstallment('OVERDUE');

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        deferDays: 7,
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_STATUS_INVALID',
      httpStatus: 409,
    });
  });
});
