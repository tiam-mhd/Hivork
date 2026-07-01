import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import { GetDashboardReportUseCase } from './get-dashboard-report.use-case.js';

const emptyAggregates = {
  todayDueCount: 0,
  todayDueAmountRial: 0n,
  overdueCount: 0,
  overdueAmountRial: 0n,
  pendingPaymentCount: 0,
  todayCollectedRial: 0n,
  thisMonthCollectedRial: 0n,
  activeSalesCount: 0,
  customersWithDebtCount: 0,
};

describe('GetDashboardReportUseCase', () => {
  const reports = { getAggregates: vi.fn() };
  const tenants = { findDetailById: vi.fn() };
  const reportCache = {
    getDashboard: vi.fn(),
    setDashboard: vi.fn(),
    invalidateTenantDashboard: vi.fn(),
  };

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached dashboard when cache hits', async () => {
    reportCache.getDashboard.mockResolvedValue({
      payload: {
        todayDueCount: 2,
        todayDueAmountRial: '1000',
        overdueCount: 1,
        overdueAmountRial: '500',
        pendingPaymentCount: 0,
        todayCollectedRial: '0',
        thisMonthCollectedRial: '0',
        activeSalesCount: 3,
        customersWithDebtCount: 1,
        updatedAt: '2025-01-15T09:00:00.000Z',
      },
      expiresAt: '2025-01-15T09:05:00.000Z',
    });

    const useCase = new GetDashboardReportUseCase(
      reports as never,
      tenants as never,
      reportCache as never,
    );

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.meta.cached).toBe(true);
    expect(result.data.todayDueCount).toBe(2);
    expect(reports.getAggregates).not.toHaveBeenCalled();
  });

  it('computes aggregates on cache miss', async () => {
    reportCache.getDashboard.mockResolvedValue(null);
    tenants.findDetailById.mockResolvedValue({ timezone: 'Asia/Tehran' });
    reports.getAggregates.mockResolvedValue({
      ...emptyAggregates,
      activeSalesCount: 4,
      todayDueAmountRial: 2_000n,
    });

    const useCase = new GetDashboardReportUseCase(
      reports as never,
      tenants as never,
      reportCache as never,
    );

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.meta.cached).toBe(false);
    expect(result.data.activeSalesCount).toBe(4);
    expect(result.data.todayDueAmountRial).toBe('2000');
    expect(reportCache.setDashboard).toHaveBeenCalled();
  });

  it('returns zeros for branch scope with no assigned branches', async () => {
    reportCache.getDashboard.mockResolvedValue(null);

    const useCase = new GetDashboardReportUseCase(
      reports as never,
      tenants as never,
      reportCache as never,
    );

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        staffId: 'staff-1',
        dataScope: 'branch',
        assignedBranchIds: [],
        activeBranchId: null,
      },
    });

    expect(result.data.activeSalesCount).toBe(0);
    expect(reports.getAggregates).not.toHaveBeenCalled();
  });

  it('degrades when cache read fails and still computes aggregates', async () => {
    reportCache.getDashboard.mockRejectedValue(new Error('redis down'));
    tenants.findDetailById.mockResolvedValue({ timezone: 'Asia/Tehran' });
    reports.getAggregates.mockResolvedValue({
      ...emptyAggregates,
      overdueCount: 2,
      overdueAmountRial: 3_000n,
    });

    const useCase = new GetDashboardReportUseCase(
      reports as never,
      tenants as never,
      reportCache as never,
    );

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.meta.cached).toBe(false);
    expect(result.data.overdueCount).toBe(2);
    expect(result.data.overdueAmountRial).toBe('3000');
    expect(reports.getAggregates).toHaveBeenCalled();
  });

  it('passes branch scope filter to repository', async () => {
    reportCache.getDashboard.mockResolvedValue(null);
    tenants.findDetailById.mockResolvedValue({ timezone: 'Asia/Tehran' });
    reports.getAggregates.mockResolvedValue(emptyAggregates);

    const useCase = new GetDashboardReportUseCase(
      reports as never,
      tenants as never,
      reportCache as never,
    );

    const branchId = '00000000-0000-4000-8000-000000000001';

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        staffId: 'staff-1',
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
      branchId,
    });

    expect(reports.getAggregates).toHaveBeenCalledWith(
      'tenant-1',
      { branchIds: [branchId] },
      expect.objectContaining({
        todayFrom: expect.any(Date),
        todayTo: expect.any(Date),
        monthFrom: expect.any(Date),
        monthTo: expect.any(Date),
      }),
    );
  });

  it('rejects branch filter outside data scope', async () => {
    const useCase = new GetDashboardReportUseCase(
      reports as never,
      tenants as never,
      reportCache as never,
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'branch',
          assignedBranchIds: ['00000000-0000-4000-8000-000000000001'],
          activeBranchId: null,
        },
        branchId: '00000000-0000-4000-8000-000000000002',
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
