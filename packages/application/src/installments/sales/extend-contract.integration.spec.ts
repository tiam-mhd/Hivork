import {
  NoOpInstallmentScheduleExtender,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaContractVersionRepository,
  PrismaInstallmentRepository,
  PrismaSaleRepository,
  PrismaService,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { ExtendContractUseCase } from './extend-contract.use-case.js';

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

describeIfDb('ExtendContractUseCase (IFP-060 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new ExtendContractUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaContractVersionRepository(prisma),
    new NoOpInstallmentScheduleExtender(),
    new PrismaBranchReader(prisma),
    new PrismaAuditService(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('extends active sale and increments version', async () => {
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
          status: 'PENDING',
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
      newLastDueDate: '2027-02-01',
      reason: 'تمدید یک ساله',
      expectedVersion: sale.version,
      staffContext: {
        staffId: staff.id,
        dataScope: 'all',
        assignedBranchIds: [branch.id],
        activeBranchId: branch.id,
      },
    });

    expect(result.extendedFromSaleId).toBe(sale.id);
    expect(result.version).toBe(sale.version + 1);

    const versions = await prisma.contractVersion.findMany({
      where: { tenantId: tenant.id, saleId: sale.id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0]?.changeType).toBe('EXTEND');
  });
});
