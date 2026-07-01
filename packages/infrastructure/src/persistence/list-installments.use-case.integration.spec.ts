import { afterAll, describe, expect, it } from 'vitest';

import { CreateSaleUseCase, ListInstallmentsUseCase } from '@hivork/application';

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

describeIfDb('ListInstallmentsUseCase (integration)', () => {
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
  const listInstallments = new ListInstallmentsUseCase(installments);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists installments by saleId after create sale', async () => {
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

    const created = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: tenant.tenantCustomers[0].id,
      branchId: tenant.branches[0].id,
      totalAmountRial: 3_000_000n,
      downPaymentRial: 0n,
      installmentCount: 3,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const list = await listInstallments.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      staffContext,
      saleId: created.id,
      limit: 20,
      sort: 'sequenceNumber:asc',
    });

    expect(list.data).toHaveLength(3);
    expect(list.meta.total).toBe(3);
    expect(list.data.map((item) => item.sequenceNumber)).toEqual([1, 2, 3]);
    expect(list.data[0]?.customer.phone).toBeTruthy();
  });

  it('excludes installments when sale is soft-deleted', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        sales: { where: { deletedAt: { not: null } }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!tenant?.sales[0] || !tenant.staff[0]) {
      return;
    }

    const list = await listInstallments.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      staffContext: {
        staffId: tenant.staff[0].id,
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
      saleId: tenant.sales[0].id,
      limit: 20,
      sort: 'dueDate:asc',
    });

    expect(list.data).toHaveLength(0);
  });
});
