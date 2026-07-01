import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  CreateSaleUseCase,
  ListInstallmentsUseCase,
  ListOverdueInstallmentsUseCase,
  startOfDayInTimezone,
  TEHRAN_TIMEZONE,
} from '@hivork/application';

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

describeIfDb('ListOverdueInstallmentsUseCase (integration)', () => {
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
  const listOverdue = new ListOverdueInstallmentsUseCase(listInstallments);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('includes overdue status and defensive pending with past due date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

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
      totalAmountRial: 4_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 1,
      staffContext,
    });

    const todayStart = startOfDayInTimezone(new Date('2026-06-29T12:00:00.000Z'), TEHRAN_TIMEZONE);
    const tenDaysAgo = new Date(todayStart.getTime() - 10 * 86_400_000);
    const threeDaysAgo = new Date(todayStart.getTime() - 3 * 86_400_000);

    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 1 },
      data: { status: 'OVERDUE', dueDate: tenDaysAgo },
    });
    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 2 },
      data: { status: 'PENDING', dueDate: threeDaysAgo },
    });

    const overdueList = await listOverdue.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      staffContext,
      limit: 20,
    });

    expect(overdueList.data).toHaveLength(2);
    expect(overdueList.meta.total).toBe(2);
    expect(overdueList.meta.totalOutstandingRial).toBe('4000000');
    expect(overdueList.data.every((row) => (row.daysOverdue ?? 0) > 0)).toBe(true);

    const filtered = await listOverdue.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      staffContext,
      minDaysOverdue: 7,
      limit: 20,
    });

    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0]?.sequenceNumber).toBe(1);

    vi.useRealTimers();
  });
});
