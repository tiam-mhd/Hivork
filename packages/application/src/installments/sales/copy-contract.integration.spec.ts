import {
  MetadataSaleCopyRelatedRepository,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaContractAttachmentRepository,
  PrismaContractNumberAllocator,
  PrismaContractVersionRepository,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaSaleRepository,
  PrismaService,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { CopyContractUseCase } from './copy-contract.use-case.js';

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

describeIfDb('CopyContractUseCase (IFP-061 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new CopyContractUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaContractVersionRepository(prisma),
    new PrismaContractAttachmentRepository(prisma),
    new MetadataSaleCopyRelatedRepository(prisma),
    new PrismaContractNumberAllocator(prisma),
    new PrismaTenantCustomerRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantPlanReader(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('copies sale with copiedFromSaleId and regenerates installments', async () => {
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

    const sourceSale = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: customer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 6_000_000n,
        downPaymentRial: 0n,
        installmentCount: 3,
        firstDueDate: new Date('2026-08-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'ACTIVE',
        contractNumber: 'CTR-2026-000001',
        metadata: {
          lineItems: [{ id: crypto.randomUUID(), description: 'کالا', amountRial: '6000000' }],
          guarantors: [{ id: crypto.randomUUID(), name: 'ضامن اول' }],
        },
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    await prisma.installment.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          saleId: sourceSale.id,
          sequenceNumber: 1,
          dueDate: new Date('2026-08-01T12:00:00.000Z'),
          amountRial: 2_000_000n,
          status: 'PAID',
          paidAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          saleId: sourceSale.id,
          sequenceNumber: 2,
          dueDate: new Date('2026-09-01T12:00:00.000Z'),
          amountRial: 2_000_000n,
          status: 'PENDING',
        },
        {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          saleId: sourceSale.id,
          sequenceNumber: 3,
          dueDate: new Date('2026-10-01T12:00:00.000Z'),
          amountRial: 2_000_000n,
          status: 'PENDING',
        },
      ],
    });

    const result = await useCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      sourceSaleId: sourceSale.id,
      contractDate: '2026-09-15',
      firstDueDate: '2026-10-15',
      copyGuarantors: true,
      reason: 'کپی قرارداد برای تست',
      staffContext: {
        staffId: staff.id,
        dataScope: 'all',
        assignedBranchIds: [branch.id],
        activeBranchId: branch.id,
      },
    });

    expect(result.newSaleId).not.toBe(sourceSale.id);
    expect(result.contractNumber).toBeTruthy();
    expect(result.sale.copiedFromSaleId).toBe(sourceSale.id);

    const newSale = await prisma.sale.findFirstOrThrow({
      where: { id: result.newSaleId, tenantId: tenant.id },
    });
    expect(newSale.copiedFromSaleId).toBe(sourceSale.id);
    expect(newSale.status).toBe('ACTIVE');

    const newInstallments = await prisma.installment.findMany({
      where: { tenantId: tenant.id, saleId: result.newSaleId },
      orderBy: { sequenceNumber: 'asc' },
    });
    expect(newInstallments).toHaveLength(3);
    expect(newInstallments.every((row) => row.status === 'PENDING')).toBe(true);
    expect(newInstallments[0]?.dueDate.toISOString()).toContain('2026-10-15');

    const sourceVersions = await prisma.contractVersion.findMany({
      where: { tenantId: tenant.id, saleId: sourceSale.id },
    });
    expect(sourceVersions.some((row) => row.changeType === 'COPY_SOURCE')).toBe(true);

    const newVersions = await prisma.contractVersion.findMany({
      where: { tenantId: tenant.id, saleId: result.newSaleId },
    });
    expect(newVersions.some((row) => row.changeType === 'CREATE')).toBe(true);

    const metadata = newSale.metadata as {
      lineItems?: unknown[];
      guarantors?: unknown[];
    };
    expect(metadata.lineItems?.length).toBe(1);
    expect(metadata.guarantors?.length).toBe(1);
  });
});
