import {
  NoOpInstallmentCloseWaiver,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaContractVersionRepository,
  PrismaInstallmentRepository,
  PrismaSaleRepository,
  PrismaService,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { ArchiveContractUseCase } from './archive-contract.use-case.js';
import { CloseContractUseCase } from './close-contract.use-case.js';
import { ListSalesUseCase } from './list-sales.use-case.js';
import { RestoreSaleUseCase } from './restore-sale.use-case.js';
import { SoftDeleteSaleUseCase } from './soft-delete-sale.use-case.js';
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

describeIfDb('Contract lifecycle (IFP-063 integration)', () => {
  const prisma = new PrismaService();
  const sales = new PrismaSaleRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const contractVersions = new PrismaContractVersionRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const audit = new PrismaAuditService(prisma);

  const terminateUseCase = new TerminateContractUseCase(
    unitOfWork,
    sales,
    installments,
    contractVersions,
    branches,
    audit,
  );
  const closeUseCase = new CloseContractUseCase(
    unitOfWork,
    sales,
    installments,
    contractVersions,
    new NoOpInstallmentCloseWaiver(),
    branches,
    audit,
  );
  const archiveUseCase = new ArchiveContractUseCase(unitOfWork, sales, branches, audit);
  const softDeleteUseCase = new SoftDeleteSaleUseCase(
    unitOfWork,
    sales,
    installments,
    branches,
    audit,
  );
  const restoreUseCase = new RestoreSaleUseCase(unitOfWork, sales, audit);
  const listSalesUseCase = new ListSalesUseCase(sales);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('close terminated sale, archive, list excludes archived, soft delete + restore', async () => {
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
        status: 'ACTIVE',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    await prisma.installment.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: tenant.id,
        saleId: sale.id,
        sequenceNumber: 1,
        dueDate: new Date('2026-10-01T12:00:00.000Z'),
        amountRial: 2_000_000n,
        status: 'PENDING',
      },
    });

    const staffContext = {
      staffId: staff.id,
      dataScope: 'all' as const,
      assignedBranchIds: [branch.id],
      activeBranchId: branch.id,
    };

    await terminateUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      saleId: sale.id,
      reason: 'فسخ برای بستن',
      staffContext,
    });

    const closed = await closeUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      saleId: sale.id,
      reason: 'بستن پس از فسخ',
      waiveRemaining: false,
      staffContext,
    });
    expect(closed.status).toBe('closed');

    const archived = await archiveUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      saleId: sale.id,
      reason: 'بایگانی پرونده',
      staffContext,
    });
    expect(archived.status).toBe('archived');

    const defaultList = await listSalesUseCase.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      staffContext,
      limit: 100,
      sort: 'createdAt:desc',
    });
    expect(defaultList.data.some((row) => row.id === sale.id)).toBe(false);

    const archivedList = await listSalesUseCase.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      staffContext,
      limit: 100,
      sort: 'createdAt:desc',
      includeArchived: true,
    });
    expect(archivedList.data.some((row) => row.id === sale.id)).toBe(true);

    await prisma.sale.update({
      where: { id: sale.id },
      data: { status: 'CANCELLED', archivedAt: null, archivedById: null, archiveReason: null },
    });

    const deleted = await softDeleteUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      branchId: branch.id,
      saleId: sale.id,
      reason: 'حذف تست',
      staffContext,
    });
    expect(deleted.id).toBe(sale.id);

    const restored = await restoreUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      saleId: sale.id,
    });
    expect(restored.id).toBe(sale.id);

    const auditEntry = await prisma.auditLog.findFirst({
      where: { tenantId: tenant.id, entityId: sale.id, action: 'sale.close' },
    });
    expect(auditEntry).not.toBeNull();
  });
});
