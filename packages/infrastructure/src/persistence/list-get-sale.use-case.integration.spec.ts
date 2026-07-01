import { afterAll, describe, expect, it } from 'vitest';

import { CreateSaleUseCase, GetSaleUseCase, ListSalesUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describeIfDb('List & Get Sale (integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const idempotency = new PrismaSaleIdempotencyStore(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const createSale = new CreateSaleUseCase(
    unitOfWork,
    sales,
    installments,
    tenantCustomers,
    branches,
    tenantPlans,
    idempotency,
    audit,
    outbox,
  );
  const listSales = new ListSalesUseCase(sales);
  const getSale = new GetSaleUseCase(sales, installments);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('create sale → list contains it → get returns ordered installments', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
        tenantCustomers: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!tenant?.branches[0] || !tenant.staff[0] || !tenant.tenantCustomers[0]) {
      throw new Error('demo-shop seed data required');
    }

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: null,
    };

    const title = `List Get ${Date.now()}`;
    const created = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: tenant.tenantCustomers[0].id,
      branchId: tenant.branches[0].id,
      title,
      totalAmountRial: 4_000_000n,
      downPaymentRial: 0n,
      installmentCount: 4,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const list = await listSales.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      staffContext,
      search: title,
      limit: 20,
      sort: 'createdAt:desc',
    });

    expect(list.data.some((item) => item.id === created.id)).toBe(true);
    expect(list.data.find((item) => item.id === created.id)?.customer?.phone).toBeTruthy();

    const detail = await getSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      saleId: created.id,
      staffContext,
    });

    expect(detail.installments).toHaveLength(4);
    expect(detail.installments.map((item) => item.sequenceNumber)).toEqual([1, 2, 3, 4]);
    expect(detail.customer.phone).toBeTruthy();
  });

  it('returns SALE_NOT_FOUND for cross-tenant get', async () => {
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });
    const demoTenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        sales: { where: { deletedAt: null }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!otherTenant || !demoTenant?.sales[0] || !demoTenant.staff[0]) {
      return;
    }

    await expect(
      getSale.execute({
        tenantId: otherTenant.id,
        actorId: demoTenant.staff[0].id,
        saleId: demoTenant.sales[0].id,
        staffContext: {
          staffId: demoTenant.staff[0].id,
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
