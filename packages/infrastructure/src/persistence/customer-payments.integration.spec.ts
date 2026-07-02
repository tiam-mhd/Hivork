import { afterAll, describe, expect, it } from 'vitest';

import { CreateSaleUseCase, ListCustomerPaymentsUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { CustomerPaymentsQuery } from './queries/customer-payments.query.js';
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

describeIfDb('ListCustomerPaymentsUseCase (integration)', () => {
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
  const paymentsQuery = new CustomerPaymentsQuery(prisma);

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

  const listPayments = new ListCustomerPaymentsUseCase(
    tenantCustomers,
    sales,
    paymentsQuery,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists payments across multiple sales with summary', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 2 },
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });
    if (!tenant?.branches[0] || !tenant.staff[0]) {
      throw new Error('demo-shop seed data required');
    }

    const phone = `0913${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Payments Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `PAY-${Date.now()}`,
      },
    });

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: tenant.branches[0].id,
    };

    const saleOne = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: `Payment Sale 1 ${Date.now()}`,
      totalAmountRial: 2_000_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const branchTwo = tenant.branches[1] ?? tenant.branches[0];
    const saleTwo = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: branchTwo.id,
      title: `Payment Sale 2 ${Date.now()}`,
      totalAmountRial: 1_000_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-02'),
      intervalDays: 30,
      staffContext,
    });

    const installmentOne = await prisma.installment.findFirstOrThrow({
      where: { saleId: saleOne.id, tenantId: tenant.id, deletedAt: null },
    });
    const installmentTwo = await prisma.installment.findFirstOrThrow({
      where: { saleId: saleTwo.id, tenantId: tenant.id, deletedAt: null },
    });

    const confirmedPayment = await prisma.paymentAttempt.create({
      data: {
        installmentId: installmentOne.id,
        tenantId: tenant.id,
        reportedByType: 'STAFF',
        reportedById: tenant.staff[0].id,
        amountRial: installmentOne.amountRial,
        status: 'CONFIRMED',
        confirmedByStaffId: tenant.staff[0].id,
        confirmedAt: new Date('2026-07-01T10:00:00.000Z'),
        createdById: tenant.staff[0].id,
        updatedById: tenant.staff[0].id,
      },
    });

    const pendingPayment = await prisma.paymentAttempt.create({
      data: {
        installmentId: installmentTwo.id,
        tenantId: tenant.id,
        reportedByType: 'CUSTOMER',
        reportedById: tenant.staff[0].id,
        amountRial: installmentTwo.amountRial,
        status: 'PENDING',
        createdById: tenant.staff[0].id,
        updatedById: tenant.staff[0].id,
      },
    });

    const result = await listPayments.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      limit: 20,
      staffContext,
    });

    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(result.items.some((item) => item.paymentId === confirmedPayment.id)).toBe(true);
    expect(result.items.some((item) => item.paymentId === pendingPayment.id)).toBe(true);
    expect(result.summary.totalPaidRial).toBeGreaterThanOrEqual(installmentOne.amountRial);
    expect(result.summary.pendingCount).toBeGreaterThanOrEqual(1);

    const confirmedOnly = await listPayments.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      status: 'confirmed',
      staffContext,
    });
    expect(confirmedOnly.items.every((item) => item.status === 'confirmed')).toBe(true);

    await prisma.paymentAttempt.updateMany({
      where: { id: { in: [confirmedPayment.id, pendingPayment.id] } },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('hides payments from branches outside staff scope', async () => {
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

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Scope Payments Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
      },
    });

    const allScope = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id, tenant.branches[1].id],
      activeBranchId: tenant.branches[0].id,
    };

    const saleVisible = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: 'Visible branch sale',
      totalAmountRial: 500_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      staffContext: allScope,
    });

    const saleHidden = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[1].id,
      title: 'Hidden branch sale',
      totalAmountRial: 500_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      staffContext: allScope,
    });

    const visibleInstallment = await prisma.installment.findFirstOrThrow({
      where: { saleId: saleVisible.id },
    });
    const hiddenInstallment = await prisma.installment.findFirstOrThrow({
      where: { saleId: saleHidden.id },
    });

    const visiblePayment = await prisma.paymentAttempt.create({
      data: {
        installmentId: visibleInstallment.id,
        tenantId: tenant.id,
        reportedByType: 'STAFF',
        reportedById: tenant.staff[0].id,
        amountRial: visibleInstallment.amountRial,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        createdById: tenant.staff[0].id,
      },
    });

    const hiddenPayment = await prisma.paymentAttempt.create({
      data: {
        installmentId: hiddenInstallment.id,
        tenantId: tenant.id,
        reportedByType: 'STAFF',
        reportedById: tenant.staff[0].id,
        amountRial: hiddenInstallment.amountRial,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        createdById: tenant.staff[0].id,
      },
    });

    const branchScoped = await listPayments.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      staffContext: {
        staffId: tenant.staff[0].id,
        dataScope: 'branch',
        assignedBranchIds: [tenant.branches[0].id],
        activeBranchId: tenant.branches[0].id,
      },
    });

    expect(branchScoped.items.some((item) => item.paymentId === visiblePayment.id)).toBe(true);
    expect(branchScoped.items.some((item) => item.paymentId === hiddenPayment.id)).toBe(false);

    await prisma.paymentAttempt.updateMany({
      where: { id: { in: [visiblePayment.id, hiddenPayment.id] } },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
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
      listPayments.execute({
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
