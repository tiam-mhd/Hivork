import { afterAll, describe, expect, it } from 'vitest';

import { CreateSaleUseCase, GetCustomerTimelineUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { CustomerTimelineQuery } from './queries/customer-timeline.query.js';
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

describeIfDb('GetCustomerTimelineUseCase (integration)', () => {
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
  const timelineQuery = new CustomerTimelineQuery(prisma);

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

  const getTimeline = new GetCustomerTimelineUseCase(
    tenantCustomers,
    sales,
    timelineQuery,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns contract, payment, note, and notification events', async () => {
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

    const phone = `0914${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Timeline Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `TL-${Date.now()}`,
      },
    });

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: tenant.branches[0].id,
    };

    const sale = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: link.id,
      branchId: tenant.branches[0].id,
      title: `Timeline Sale ${Date.now()}`,
      totalAmountRial: 2_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const installment = await prisma.installment.findFirst({
      where: { saleId: sale.id, tenantId: tenant.id, deletedAt: null },
      orderBy: { sequenceNumber: 'asc' },
    });
    if (!installment) {
      throw new Error('installment required');
    }

    const payment = await prisma.paymentAttempt.create({
      data: {
        installmentId: installment.id,
        tenantId: tenant.id,
        reportedByType: 'STAFF',
        reportedById: tenant.staff[0].id,
        amountRial: installment.amountRial,
        status: 'CONFIRMED',
        confirmedByStaffId: tenant.staff[0].id,
        confirmedAt: new Date(),
        createdById: tenant.staff[0].id,
        updatedById: tenant.staff[0].id,
      },
    });

    const note = await prisma.customerNote.create({
      data: {
        tenantId: tenant.id,
        tenantCustomerId: link.id,
        body: 'یادداشت تست timeline',
        authorStaffId: tenant.staff[0].id,
        createdById: tenant.staff[0].id,
        updatedById: tenant.staff[0].id,
      },
    });

    await prisma.notificationLog.create({
      data: {
        tenantId: tenant.id,
        installmentId: installment.id,
        channel: 'sms',
        reminderType: 'due_reminder',
        status: 'sent',
        idempotencyKey: `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recipientRef: phone,
        sentAt: new Date(),
      },
    });

    const timeline = await getTimeline.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      limit: 20,
      staffContext,
    });

    expect(timeline.items.some((item) => item.type === 'contract')).toBe(true);
    expect(timeline.items.some((item) => item.type === 'payment' && item.id === `payment:${payment.id}`)).toBe(
      true,
    );
    expect(timeline.items.some((item) => item.type === 'note' && item.id === `note:${note.id}`)).toBe(true);
    expect(timeline.items.some((item) => item.type === 'sms')).toBe(true);

    await prisma.customerNote.update({
      where: { id: note.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
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

  it('rejects cross-tenant timeline as not found', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
    if (tenants.length < 2) {
      return;
    }

    const [tenantA, tenantB] = tenants;
    const customerOnA = await prisma.tenantCustomer.findFirst({
      where: { tenantId: tenantA.id, deletedAt: null },
    });
    if (!customerOnA) {
      return;
    }

    await expect(
      getTimeline.execute({
        tenantId: tenantB.id,
        tenantCustomerId: customerOnA.id,
        staffContext: {
          staffId: '00000000-0000-0000-0000-000000000001',
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
