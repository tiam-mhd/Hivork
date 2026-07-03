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
import { ApplyPenaltyUseCase } from './apply-penalty.use-case.js';
import { CalculatePenaltyPreviewUseCase } from './calculate-penalty-preview.use-case.js';

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

describeIfDb('ApplyPenaltyUseCase (IFP-097 integration)', () => {
  const prisma = new PrismaService();
  const installments = new PrismaInstallmentRepository(prisma);
  const adjustments = new PrismaInstallmentAdjustmentRepository(prisma);
  const operationLogs = new PrismaInstallmentOperationLogRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  const applyPenalty = new ApplyPenaltyUseCase(
    unitOfWork,
    installments,
    adjustments,
    operationLogs,
    branches,
    tenantSettings,
    audit,
  );

  const previewPenalty = new CalculatePenaltyPreviewUseCase(
    installments,
    adjustments,
    branches,
    tenantSettings,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedOverdueInstallment(amountRial = 10_000_000n) {
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
        firstDueDate: new Date('2026-01-01T12:00:00.000Z'),
        contractDate: new Date('2026-01-01'),
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
        dueDate: new Date('2026-01-01T12:00:00.000Z'),
        amountRial,
        status: 'OVERDUE',
      },
    });

    return { tenant, branch, staff, sale, installment };
  }

  it('preview returns calculated penalty for overdue installment', async () => {
    const { branch, staff, installment } = await seedOverdueInstallment();

    const preview = await previewPenalty.execute({
      tenantId: installment.tenantId,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(preview.overdueDays).toBeGreaterThan(0);
    expect(typeof preview.calculatedPenaltyRial).toBe('string');
  });

  it('manual apply increases installment amountRial and creates adjustment', async () => {
    const { branch, staff, sale, installment } = await seedOverdueInstallment();
    const penaltyRial = 250_000n;

    const result = await applyPenalty.execute({
      tenantId: installment.tenantId,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      mode: 'manual',
      amountRial: penaltyRial,
      reason: 'جریمه تأخیر',
      expectedVersion: installment.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.adjustment.amountRial).toBe(penaltyRial.toString());
    expect(result.installment.amountRial).toBe((10_000_000n + penaltyRial).toString());
    expect(result.installment.version).toBe(installment.version + 1);

    const updated = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id },
    });
    expect(updated.amountRial).toBe(10_000_000n + penaltyRial);

    const adjustmentRows = await prisma.installmentAdjustment.findMany({
      where: { installmentId: installment.id, adjustmentType: 'PENALTY' },
    });
    expect(adjustmentRows).toHaveLength(1);
    expect(adjustmentRows[0]?.amountRial).toBe(penaltyRial);

    const opLog = await prisma.installmentOperationLog.findFirst({
      where: { saleId: sale.id, operationType: 'penalty' },
      orderBy: { createdAt: 'desc' },
    });
    expect(opLog).not.toBeNull();
  });

  it('rejects penalty on pending installment', async () => {
    const { branch, staff, installment } = await seedOverdueInstallment();
    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'PENDING' },
    });

    await expect(
      applyPenalty.execute({
        tenantId: installment.tenantId,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        mode: 'manual',
        amountRial: 100_000n,
        reason: 'جریمه تأخیر',
        expectedVersion: installment.version,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_NOT_OVERDUE',
    } satisfies Partial<ApplicationError>);
  });
});
