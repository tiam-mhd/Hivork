import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentOperationLogRepository,
  PrismaInstallmentRepository,
  PrismaSaleRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { MergeInstallmentsUseCase } from './merge-installments.use-case.js';

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

describeIfDb('MergeInstallmentsUseCase (IFP-084 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new MergeInstallmentsUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaInstallmentOperationLogRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedSaleWithPendingInstallments() {
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
        totalAmountRial: 15_000_000n,
        downPaymentRial: 0n,
        installmentCount: 3,
        firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'ACTIVE',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const installments = await Promise.all(
      [
        { sequenceNumber: 4, amountRial: 5_000_000n, dueDate: '2026-10-01T12:00:00.000Z' },
        { sequenceNumber: 5, amountRial: 5_000_000n, dueDate: '2026-11-01T12:00:00.000Z' },
        { sequenceNumber: 6, amountRial: 5_000_000n, dueDate: '2026-12-01T12:00:00.000Z' },
      ].map((item) =>
        prisma.installment.create({
          data: {
            tenantId: tenant.id,
            saleId: sale.id,
            sequenceNumber: item.sequenceNumber,
            dueDate: new Date(item.dueDate),
            amountRial: item.amountRial,
            status: 'PENDING',
          },
        }),
      ),
    );

    return { tenant, branch, staff, sale, installments };
  }

  it('merges installments and preserves total amount', async () => {
    const { tenant, branch, staff, sale, installments } = await seedSaleWithPendingInstallments();
    const mergeIds = installments.map((item) => item.id);
    const sourceTotal = installments.reduce((sum, item) => sum + item.amountRial, 0n);

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      installmentIds: mergeIds,
      targetDueDate: '2027-01-01',
      reason: 'ادغام سه قسط متوالی به یک قسط',
      expectedVersions: Object.fromEntries(
        installments.map((item) => [item.id, item.version]),
      ),
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.removedInstallmentIds).toEqual(mergeIds);
    expect(result.mergedInstallment.sequenceNumber).toBe(4);
    expect(result.mergedInstallment.amountRial).toBe(sourceTotal);

    const activeInstallments = await prisma.installment.findMany({
      where: { tenantId: tenant.id, saleId: sale.id, deletedAt: null },
    });
    expect(activeInstallments).toHaveLength(1);
    expect(activeInstallments[0]?.id).toBe(result.mergedInstallment.id);
  });

  it('rejects merge when a paid installment is included', async () => {
    const { tenant, branch, staff, sale, installments } = await seedSaleWithPendingInstallments();

    const paid = installments[0]!;
    await prisma.installment.update({
      where: { id: paid.id },
      data: { status: 'PAID', paidAt: new Date(), version: { increment: 1 } },
    });
    const paidUpdated = await prisma.installment.findUniqueOrThrow({ where: { id: paid.id } });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        saleId: sale.id,
        installmentIds: installments.map((item) => item.id),
        targetDueDate: '2027-01-01',
        reason: 'ادغام سه قسط متوالی به یک قسط',
        expectedVersions: Object.fromEntries(
          installments.map((item) => [
            item.id,
            item.id === paid.id ? paidUpdated.version : item.version,
          ]),
        ),
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_STATUS_INVALID',
      httpStatus: 409,
    });
  });
});
