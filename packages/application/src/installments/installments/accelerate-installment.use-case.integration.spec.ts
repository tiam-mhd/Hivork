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

import { AccelerateInstallmentUseCase } from './accelerate-installment.use-case.js';

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

describeIfDb('AccelerateInstallmentUseCase (IFP-082 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new AccelerateInstallmentUseCase(
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

  async function seedInstallment(options: {
    dueDate: string;
    status: 'PENDING' | 'OVERDUE';
  }) {
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
        firstDueDate: new Date(options.dueDate),
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
        dueDate: new Date(options.dueDate),
        amountRial: 2_000_000n,
        status: options.status,
      },
    });

    return { tenant, branch, staff, installment };
  }

  it('accelerates a pending installment to an earlier due date', async () => {
    const { tenant, branch, staff, installment } = await seedInstallment({
      dueDate: '2026-12-01T12:00:00.000Z',
      status: 'PENDING',
    });

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      newDueDate: '2026-11-01',
      reason: 'مشتری درخواست پرداخت زودتر داد',
      expectedVersion: installment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.previousDueDate.toISOString()).toBe('2026-12-01T12:00:00.000Z');
    expect(result.installment.dueDate.toISOString()).toBe('2026-11-01T12:00:00.000Z');
    expect(result.installment.status).toBe('PENDING');
    expect(result.installment.version).toBe(installment.version + 1);

    const log = await prisma.installmentOperationLog.findUniqueOrThrow({
      where: { id: result.operationLogId },
    });
    expect(log.operationType).toBe('accelerate');
  });

  it('rejects accelerate when new due date is after current due date', async () => {
    const { tenant, branch, staff, installment } = await seedInstallment({
      dueDate: '2026-12-01T12:00:00.000Z',
      status: 'PENDING',
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        newDueDate: '2027-01-01',
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'DUE_DATE_INVALID',
      httpStatus: 400,
    });
  });

  it('moves overdue installment to pending when accelerated to today or later', async () => {
    const { tenant, branch, staff, installment } = await seedInstallment({
      dueDate: '2026-06-01T12:00:00.000Z',
      status: 'OVERDUE',
    });

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      newDueDate: '2026-07-02',
      expectedVersion: installment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.installment.status).toBe('PENDING');
    expect(result.installment.dueDate.toISOString()).toBe('2026-07-02T12:00:00.000Z');
  });
});
