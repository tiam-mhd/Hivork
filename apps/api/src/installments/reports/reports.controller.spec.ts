import { describe, expect, it, vi } from 'vitest';

import { GetCashflowForecastUseCase, GetDashboardReportUseCase, ListTodayDueInstallmentsUseCase } from '@hivork/application';

import { ReportsController } from './reports.controller.js';

const emptyDashboard = {
  todayDueCount: 0,
  todayDueAmountRial: '0',
  overdueCount: 0,
  overdueAmountRial: '0',
  pendingPaymentCount: 0,
  todayCollectedRial: '0',
  thisMonthCollectedRial: '0',
  activeSalesCount: 0,
  customersWithDebtCount: 0,
  updatedAt: '2025-01-15T09:00:00.000Z',
};

const cashflowBuckets = [
  { month: '2026-06', installmentCount: 1, totalRial: '1500000' },
  { month: '2026-07', installmentCount: 0, totalRial: '0' },
  { month: '2026-08', installmentCount: 2, totalRial: '2500000' },
  { month: '2026-09', installmentCount: 0, totalRial: '0' },
  { month: '2026-10', installmentCount: 0, totalRial: '0' },
  { month: '2026-11', installmentCount: 0, totalRial: '0' },
];

describe('ReportsController', () => {
  const getDashboardReport = { execute: vi.fn() };
  const getCashflowForecast = { execute: vi.fn() };
  const listTodayDue = { execute: vi.fn() };
  const controller = new ReportsController(
    getDashboardReport as unknown as GetDashboardReportUseCase,
    getCashflowForecast as unknown as GetCashflowForecastUseCase,
    listTodayDue as unknown as ListTodayDueInstallmentsUseCase,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  it('returns dashboard KPIs with meta', async () => {
    getDashboardReport.execute.mockResolvedValue({
      data: { ...emptyDashboard, activeSalesCount: 2 },
      meta: { cached: false },
    });

    await expect(controller.dashboard(staff, {})).resolves.toEqual({
      data: { ...emptyDashboard, activeSalesCount: 2 },
      meta: { cached: false },
    });

    expect(getDashboardReport.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        staffId: 'staff-1',
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
      branchId: undefined,
      activeBranchId: undefined,
    });
  });

  it('returns today-due installments with meta', async () => {
    listTodayDue.execute.mockResolvedValue({
      data: [
        {
          id: 'inst-1',
          saleId: 'sale-1',
          customer: { id: 'cust-1', phone: '09120000000', name: 'علی' },
          branchId: 'branch-1',
          sequenceNumber: 1,
          dueDate: '2026-06-29T00:00:00.000Z',
          amountRial: '1000000',
          status: 'pending',
        },
      ],
      meta: {
        total: 1,
        totalAmountRial: '1000000',
        hasNext: false,
        nextCursor: null,
      },
    });

    const result = await controller.todayDue(staff, { limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(listTodayDue.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        staffId: 'staff-1',
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
      branchId: undefined,
      activeBranchId: undefined,
      cursor: undefined,
      limit: 10,
    });
  });

  it('returns six monthly cashflow buckets', async () => {
    getCashflowForecast.execute.mockResolvedValue({
      data: cashflowBuckets,
      fromMonth: '2026-06',
      toMonth: '2026-11',
      updatedAt: '2026-06-29T12:00:00.000Z',
    });

    const result = await controller.cashflow(staff, {});

    expect(result.data.buckets).toHaveLength(6);
    expect(result.data.fromMonth).toBe('2026-06');
    expect(result.data.toMonth).toBe('2026-11');
    expect(result.meta).toEqual({});
    expect(getCashflowForecast.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        staffId: 'staff-1',
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
      branchId: undefined,
      activeBranchId: undefined,
    });
  });
});
