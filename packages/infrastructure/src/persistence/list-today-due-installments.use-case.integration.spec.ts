import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  CreateSaleUseCase,
  getTehranTodayUtcRange,
  ListInstallmentsUseCase,
  ListTodayDueInstallmentsUseCase,
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

describeIfDb('ListTodayDueInstallmentsUseCase (integration)', () => {
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
  const listTodayDue = new ListTodayDueInstallmentsUseCase(listInstallments);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('includes installment due today and excludes tomorrow', async () => {
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
      totalAmountRial: 2_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 1,
      staffContext,
    });

    const { from: todayFrom, to: todayTo } = getTehranTodayUtcRange();
    const tomorrow = new Date(todayTo.getTime() + 60_000);

    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 1 },
      data: { dueDate: new Date(todayFrom.getTime() + 3_600_000) },
    });
    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 2 },
      data: { dueDate: tomorrow },
    });

    const todayList = await listTodayDue.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      staffContext,
      limit: 20,
    });

    expect(todayList.data).toHaveLength(1);
    expect(todayList.data[0]?.sequenceNumber).toBe(1);
    expect(BigInt(todayList.meta.totalAmountRial)).toBeGreaterThan(0n);

    vi.useRealTimers();
  });
});
