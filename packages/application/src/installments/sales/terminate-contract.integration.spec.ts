import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaContractVersionRepository,
  PrismaInstallmentRepository,
  PrismaSaleRepository,
  PrismaService,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { TerminateContractUseCase } from './terminate-contract.use-case.js';

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

describeIfDb('TerminateContractUseCase (IFP-062 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new TerminateContractUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaContractVersionRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaAuditService(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('terminates active sale with paid installments and writes audit', async () => {
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
        totalAmountRial: 4_000_000n,
        downPaymentRial: 0n,
        installmentCount: 2,
        firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'ACTIVE',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    await prisma.installment.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          saleId: sale.id,
          sequenceNumber: 1,
          dueDate: new Date('2026-10-01T12:00:00.000Z'),
          amountRial: 2_000_000n,
          status: 'PAID',
          paidAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          saleId: sale.id,
          sequenceNumber: 2,
          dueDate: new Date('2026-11-01T12:00:00.000Z'),
          amountRial: 2_000_000n,
          status: 'PENDING',
        },
      ],
    });

    const result = await useCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      saleId: sale.id,
      reason: 'فسخ با مابه‌التفاوت',
      effectiveDate: '2026-06-01',
      staffContext: {
        staffId: staff.id,
        dataScope: 'all',
        assignedBranchIds: [branch.id],
        activeBranchId: branch.id,
      },
    });

    expect(result.status).toBe('terminated');
    expect(result.terminatedAt).toBe('2026-06-01T00:00:00.000Z');

    const persisted = await prisma.sale.findFirstOrThrow({ where: { id: sale.id } });
    expect(persisted.status).toBe('TERMINATED');
    expect(persisted.terminateReason).toBe('فسخ با مابه‌التفاوت');

    const pendingInstallments = await prisma.installment.count({
      where: { saleId: sale.id, status: 'PENDING' },
    });
    expect(pendingInstallments).toBe(1);

    const versions = await prisma.contractVersion.findMany({
      where: { tenantId: tenant.id, saleId: sale.id },
    });
    expect(versions.some((row) => row.changeType === 'TERMINATE')).toBe(true);

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        entityId: sale.id,
        action: 'sale.terminate',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('rejects terminate on cancelled sale', async () => {
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
        firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'لغو تست',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        staffId: staff.id,
        branchId: branch.id,
        saleId: sale.id,
        reason: 'تلاش فسخ',
        staffContext: {
          staffId: staff.id,
          dataScope: 'all',
          assignedBranchIds: [branch.id],
          activeBranchId: branch.id,
        },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      httpStatus: 409,
    });
  });
});
