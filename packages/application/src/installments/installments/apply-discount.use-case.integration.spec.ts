import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentAdjustmentRepository,
  PrismaInstallmentOperationLogRepository,
  PrismaInstallmentRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import { ApplyDiscountUseCase } from './apply-discount.use-case.js';

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

describeIfDb('ApplyDiscountUseCase (IFP-098 integration)', () => {
  const prisma = new PrismaService();
  const installments = new PrismaInstallmentRepository(prisma);
  const adjustments = new PrismaInstallmentAdjustmentRepository(prisma);
  const operationLogs = new PrismaInstallmentOperationLogRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  const applyDiscount = new ApplyDiscountUseCase(
    unitOfWork,
    installments,
    adjustments,
    operationLogs,
    branches,
    tenantSettings,
    audit,
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

  it('manual discount reduces installment amountRial and creates adjustment', async () => {
    const { branch, staff, sale, installment } = await seedPendingInstallment();
    const discountRial = 500_000n;

    const result = await applyDiscount.execute({
      tenantId: installment.tenantId,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      discountRial,
      reason: 'تخفیف وفاداری',
      expectedVersion: installment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.adjustment.adjustmentType).toBe('discount');
    expect(result.adjustment.amountRial).toBe(discountRial.toString());
    expect(result.installment.amountRial).toBe((10_000_000n - discountRial).toString());
    expect(result.installment.version).toBe(installment.version + 1);

    const updated = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id },
    });
    expect(updated.amountRial).toBe(10_000_000n - discountRial);

    const adjustmentRows = await prisma.installmentAdjustment.findMany({
      where: { installmentId: installment.id, adjustmentType: 'DISCOUNT' },
    });
    expect(adjustmentRows).toHaveLength(1);

    const opLog = await prisma.installmentOperationLog.findFirst({
      where: { saleId: sale.id, operationType: 'discount' },
      orderBy: { createdAt: 'desc' },
    });
    expect(opLog).not.toBeNull();
  });

  it('enforces max discount percent from tenant settings', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await prisma.tenantSettings.upsert({
      where: {
        tenantId_module: { tenantId: tenant.id, module: 'installments' },
      },
      create: {
        tenantId: tenant.id,
        module: 'installments',
        settings: { discount_max_percent_bps: 1000 },
      },
      update: {
        settings: { discount_max_percent_bps: 1000 },
      },
    });

    await expect(
      applyDiscount.execute({
        tenantId: installment.tenantId,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        discountRial: 2_000_000n,
        reason: 'تخفیف بیش از حد',
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'DISCOUNT_MAX_EXCEEDED',
    } satisfies Partial<ApplicationError>);
  });

  it('rejects discount on paid installment', async () => {
    const { branch, staff, installment } = await seedPendingInstallment();
    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'PAID' },
    });

    await expect(
      applyDiscount.execute({
        tenantId: installment.tenantId,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        discountRial: 100_000n,
        reason: 'تخفیف نامعتبر',
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_STATUS_INVALID',
    } satisfies Partial<ApplicationError>);
  });
});
