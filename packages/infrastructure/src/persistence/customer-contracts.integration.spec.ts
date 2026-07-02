import { afterAll, describe, expect, it } from 'vitest';

import { CreateSaleUseCase, ListCustomerContractsUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { CustomerContractsQuery } from './queries/customer-contracts.query.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ensureTestGlobalCustomer } from './test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function pastDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 10);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describeIfDb('ListCustomerContractsUseCase (integration)', () => {
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
  const contractsQuery = new CustomerContractsQuery(prisma);

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

  const listContracts = new ListCustomerContractsUseCase(
    tenantCustomers,
    sales,
    contractsQuery,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists contracts with status buckets and paid/overdue aggregates', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });
    if (!tenant?.branches[0] || !tenant.staff[0]) {
      throw new Error('demo-shop seed data required');
    }

    const phone = `0911${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Contracts Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `CON-${Date.now()}`,
      },
    });

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: tenant.branches[0].id,
    };

    const activeSale = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: `Active Contract ${Date.now()}`,
      totalAmountRial: 3_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const overdueSale = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: `Overdue Contract ${Date.now()}`,
      totalAmountRial: 1_000_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: pastDueDate(),
      contractDate: new Date('2026-06-01'),
      intervalDays: 30,
      staffContext,
    });

    await prisma.installment.updateMany({
      where: { saleId: overdueSale.id, tenantId: tenant.id },
      data: { status: 'OVERDUE' },
    });

    const cancelledSale = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: `Cancelled Contract ${Date.now()}`,
      totalAmountRial: 500_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-05-01'),
      intervalDays: 30,
      staffContext,
    });

    await prisma.sale.update({
      where: { id: cancelledSale.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: tenant.staff[0].id,
      },
    });

    const activeInstallment = await prisma.installment.findFirstOrThrow({
      where: { saleId: activeSale.id, tenantId: tenant.id, deletedAt: null },
      orderBy: { sequenceNumber: 'asc' },
    });

    await prisma.paymentAttempt.create({
      data: {
        installmentId: activeInstallment.id,
        tenantId: tenant.id,
        reportedByType: 'STAFF',
        reportedById: tenant.staff[0].id,
        amountRial: activeInstallment.amountRial,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedByStaffId: tenant.staff[0].id,
        createdById: tenant.staff[0].id,
      },
    });

    const result = await listContracts.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      limit: 20,
      staffContext,
    });

    expect(result.items.length).toBeGreaterThanOrEqual(3);

    const activeRow = result.items.find((item) => item.saleId === activeSale.id);
    expect(activeRow?.status).toBe('active');
    expect(activeRow?.paidAmountRial).toBeGreaterThan(0n);
    expect(activeRow?.branchName).toBeTruthy();
    expect(activeRow?.sellerName).toBeTruthy();

    const overdueRow = result.items.find((item) => item.saleId === overdueSale.id);
    expect(overdueRow?.status).toBe('overdue');
    expect(overdueRow?.overdueCount).toBeGreaterThanOrEqual(1);

    const cancelledRow = result.items.find((item) => item.saleId === cancelledSale.id);
    expect(cancelledRow?.status).toBe('cancelled');

    const overdueOnly = await listContracts.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      status: 'overdue',
      staffContext,
    });
    expect(overdueOnly.items.every((item) => item.status === 'overdue')).toBe(true);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('hides contracts from branches outside staff scope', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 2 },
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });
    if (!tenant?.branches[0] || !tenant.branches[1] || !tenant.staff[0]) {
      return;
    }

    const phone = `0910${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Scope Contracts Customer');
    const link = await prisma.tenantCustomer.create({
      data: { tenantId: tenant.id, globalCustomerId: globalCustomer.id },
    });

    const allScope = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id, tenant.branches[1].id],
      activeBranchId: tenant.branches[0].id,
    };

    const visibleSale = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: 'Visible branch contract',
      totalAmountRial: 500_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      staffContext: allScope,
    });

    const hiddenSale = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[1].id,
      title: 'Hidden branch contract',
      totalAmountRial: 500_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-02'),
      staffContext: allScope,
    });

    const branchScoped = await listContracts.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      staffContext: {
        staffId: tenant.staff[0].id,
        dataScope: 'branch',
        assignedBranchIds: [tenant.branches[0].id],
        activeBranchId: tenant.branches[0].id,
      },
    });

    expect(branchScoped.items.some((item) => item.saleId === visibleSale.id)).toBe(true);
    expect(branchScoped.items.some((item) => item.saleId === hiddenSale.id)).toBe(false);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('rejects cross-tenant access as not found', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
    if (tenants.length < 2) {
      return;
    }

    const customer = await prisma.tenantCustomer.findFirst({
      where: { tenantId: tenants[0]!.id, deletedAt: null },
    });
    if (!customer) {
      return;
    }

    await expect(
      listContracts.execute({
        tenantId: tenants[1]!.id,
        tenantCustomerId: customer.id,
        staffContext: {
          staffId: crypto.randomUUID(),
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });
  });
});
