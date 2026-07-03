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

import { RegenerateInstallmentsUseCase } from './regenerate-installments.use-case.js';

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

describeIfDb('RegenerateInstallmentsUseCase (IFP-083 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new RegenerateInstallmentsUseCase(
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

  async function seedSaleWithInstallments() {
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
        totalAmountRial: 12_000_000n,
        downPaymentRial: 0n,
        installmentCount: 4,
        firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'ACTIVE',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const dueDates = [
      '2026-10-01T12:00:00.000Z',
      '2026-11-01T12:00:00.000Z',
      '2026-12-01T12:00:00.000Z',
      '2027-01-01T12:00:00.000Z',
    ];

    const installments = await Promise.all(
      [3_000_000n, 3_000_000n, 3_000_000n, 3_000_000n].map((amountRial, index) =>
        prisma.installment.create({
          data: {
            tenantId: tenant.id,
            saleId: sale.id,
            sequenceNumber: index + 1,
            dueDate: new Date(dueDates[index]!),
            amountRial,
            status: index < 2 ? 'PAID' : 'PENDING',
            ...(index < 2 ? { paidAt: new Date() } : {}),
          },
        }),
      ),
    );

    return { tenant, branch, staff, sale, installments };
  }

  it('regenerates pending installments, soft-deletes old rows, and preserves total', async () => {
    const { tenant, branch, staff, sale, installments } = await seedSaleWithInstallments();
    const pendingBefore = installments.filter((item) => item.status === 'PENDING');
    const pendingTotal = pendingBefore.reduce((sum, item) => sum + item.amountRial, 0n);

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      reason: 'توافق مجدد اقساط با مشتری',
      schedule: {
        firstDueDate: '2027-01-01',
        installmentCount: 3,
        intervalDays: 30,
      },
      roundingPolicy: 'last_installment_absorbs_remainder',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.removedInstallmentIds).toEqual(pendingBefore.map((item) => item.id));
    expect(result.newInstallments).toHaveLength(3);
    expect(
      result.newInstallments.reduce((sum, item) => sum + item.amountRial, 0n),
    ).toBe(pendingTotal);

    const activeInstallments = await prisma.installment.findMany({
      where: { tenantId: tenant.id, saleId: sale.id, deletedAt: null },
      orderBy: { sequenceNumber: 'asc' },
    });
    expect(activeInstallments).toHaveLength(5);
    expect(activeInstallments.filter((item) => item.status === 'PAID')).toHaveLength(2);

    const removedRows = await prisma.$queryRaw<Array<{ id: string; delete_reason: string | null }>>`
      SELECT id, delete_reason
      FROM installments
      WHERE tenant_id = ${tenant.id}::uuid
        AND sale_id = ${sale.id}::uuid
        AND deleted_at IS NOT NULL
    `;
    expect(removedRows).toHaveLength(2);
    expect(removedRows.every((row) => row.delete_reason === 'regenerate')).toBe(true);
  });

  it('returns NO_INSTALLMENTS_TO_REGENERATE when only paid installments remain', async () => {
    const { tenant, branch, staff, sale, installments } = await seedSaleWithInstallments();

    await prisma.installment.updateMany({
      where: {
        id: { in: installments.filter((item) => item.status === 'PENDING').map((item) => item.id) },
      },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        saleId: sale.id,
        reason: 'توافق مجدد اقساط با مشتری',
        schedule: {
          firstDueDate: '2027-01-01',
          installmentCount: 2,
          intervalDays: 30,
        },
        roundingPolicy: 'last_installment_absorbs_remainder',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'NO_INSTALLMENTS_TO_REGENERATE',
      httpStatus: 400,
    });
  });
});
