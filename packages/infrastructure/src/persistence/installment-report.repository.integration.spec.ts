import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  CreateSaleUseCase,
  getCalendarMonthRangeInTimezone,
  getCashflowForecastWindow,
  getTodayUtcRangeInTimezone,
  startOfDayInTimezone,
  TEHRAN_TIMEZONE,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaInstallmentReportRepository } from './installment-report.repository.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
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

describeIfDb('PrismaInstallmentReportRepository (integration)', () => {
  const prisma = new PrismaService();
  const reports = new PrismaInstallmentReportRepository(prisma);

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

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('aggregates dashboard KPIs for seeded tenant', async () => {
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
      totalAmountRial: 3_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const now = new Date('2026-06-29T12:00:00.000Z');
    const today = getTodayUtcRangeInTimezone(now, TEHRAN_TIMEZONE);
    const month = getCalendarMonthRangeInTimezone(now, TEHRAN_TIMEZONE);
    const tenDaysAgo = new Date(
      startOfDayInTimezone(now, TEHRAN_TIMEZONE).getTime() - 10 * 86_400_000,
    );

    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 1 },
      data: { status: 'OVERDUE', dueDate: tenDaysAgo, amountRial: 1_500_000n },
    });
    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 2 },
      data: {
        status: 'PAID',
        paidAt: new Date('2026-06-29T10:00:00.000Z'),
        amountRial: 1_500_000n,
      },
    });

    const allScope = await reports.getAggregates(
      tenant.id,
      {},
      {
        todayFrom: today.from,
        todayTo: today.to,
        monthFrom: month.from,
        monthTo: month.to,
      },
    );

    expect(allScope.activeSalesCount).toBeGreaterThanOrEqual(1);
    expect(allScope.overdueCount).toBeGreaterThanOrEqual(1);
    expect(allScope.overdueAmountRial).toBeGreaterThanOrEqual(1_500_000n);
    expect(allScope.todayCollectedRial).toBeGreaterThanOrEqual(1_500_000n);
    expect(allScope.thisMonthCollectedRial).toBeGreaterThanOrEqual(1_500_000n);
    expect(allScope.customersWithDebtCount).toBeGreaterThanOrEqual(1);

    const wrongBranchId = '00000000-0000-4000-8000-000000009999';
    const scoped = await reports.getAggregates(
      tenant.id,
      { branchIds: [wrongBranchId] },
      {
        todayFrom: today.from,
        todayTo: today.to,
        monthFrom: month.from,
        monthTo: month.to,
      },
    );

    expect(scoped.overdueCount).toBe(0);
    expect(scoped.activeSalesCount).toBe(0);
    expect(scoped.todayCollectedRial).toBe(0n);

    const branchScoped = await reports.getAggregates(
      tenant.id,
      { branchIds: [tenant.branches[0].id] },
      {
        todayFrom: today.from,
        todayTo: today.to,
        monthFrom: month.from,
        monthTo: month.to,
      },
    );

    expect(branchScoped.overdueCount).toBeGreaterThanOrEqual(1);
    expect(branchScoped.overdueCount).toBeLessThanOrEqual(allScope.overdueCount);

    vi.useRealTimers();
  });

  it('returns zeros when tenant has no matching sales', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const now = new Date();
    const today = getTodayUtcRangeInTimezone(now, tenant.timezone);
    const month = getCalendarMonthRangeInTimezone(now, tenant.timezone);

    const result = await reports.getAggregates(
      tenant.id,
      { createdByStaffId: '00000000-0000-4000-8000-000000000099' },
      {
        todayFrom: today.from,
        todayTo: today.to,
        monthFrom: month.from,
        monthTo: month.to,
      },
    );

    expect(result).toEqual({
      todayDueCount: 0,
      todayDueAmountRial: 0n,
      overdueCount: 0,
      overdueAmountRial: 0n,
      pendingPaymentCount: 0,
      todayCollectedRial: 0n,
      thisMonthCollectedRial: 0n,
      activeSalesCount: 0,
      customersWithDebtCount: 0,
    });
  });

  it('groups pending and overdue installments into monthly cashflow buckets', async () => {
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
      intervalDays: 30,
      staffContext,
    });

    const juneDue = startOfDayInTimezone(new Date('2026-06-15T12:00:00.000Z'), TEHRAN_TIMEZONE);
    const julyDue = startOfDayInTimezone(new Date('2026-07-15T12:00:00.000Z'), TEHRAN_TIMEZONE);

    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 1 },
      data: { status: 'PENDING', dueDate: juneDue, amountRial: 1_500_000n },
    });
    await prisma.installment.updateMany({
      where: { saleId: created.id, sequenceNumber: 2 },
      data: { status: 'OVERDUE', dueDate: julyDue, amountRial: 2_500_000n },
    });

    const window = getCashflowForecastWindow(new Date('2026-06-29T12:00:00.000Z'), TEHRAN_TIMEZONE);

    const allScope = await reports.getCashflowByMonth(
      tenant.id,
      {},
      { from: window.from, toExclusive: window.toExclusive },
      TEHRAN_TIMEZONE,
    );

    const june = allScope.find((bucket) => bucket.month === '2026-06');
    const july = allScope.find((bucket) => bucket.month === '2026-07');

    expect(june?.installmentCount).toBe(1);
    expect(june?.totalRial).toBe(1_500_000n);
    expect(july?.installmentCount).toBe(1);
    expect(july?.totalRial).toBe(2_500_000n);

    const wrongBranch = await reports.getCashflowByMonth(
      tenant.id,
      { branchIds: ['00000000-0000-4000-8000-000000009999'] },
      { from: window.from, toExclusive: window.toExclusive },
      TEHRAN_TIMEZONE,
    );

    expect(wrongBranch).toEqual([]);

    vi.useRealTimers();
  });
});
