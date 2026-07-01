import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import { GetCashflowForecastUseCase } from './get-cashflow-forecast.use-case.js';

describe('GetCashflowForecastUseCase', () => {
  const reports = { getCashflowByMonth: vi.fn() };
  const tenants = { findDetailById: vi.fn() };

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    tenants.findDetailById.mockResolvedValue({ timezone: 'Asia/Tehran' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns six padded month buckets with bigint totals as strings', async () => {
    reports.getCashflowByMonth.mockResolvedValue([
      { month: '2026-06', installmentCount: 1, totalRial: 1_500_000n },
      { month: '2026-08', installmentCount: 2, totalRial: 2_500_000n },
    ]);

    const useCase = new GetCashflowForecastUseCase(reports as never, tenants as never);

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.data).toHaveLength(6);
    expect(result.data[0]).toEqual({
      month: '2026-06',
      installmentCount: 1,
      totalRial: '1500000',
    });
    expect(result.data[1]).toEqual({
      month: '2026-07',
      installmentCount: 0,
      totalRial: '0',
    });
    expect(result.fromMonth).toBe('2026-06');
    expect(result.toMonth).toBe('2026-11');
    expect(result.updatedAt).toBe('2026-06-29T12:00:00.000Z');
  });

  it('passes branch scope filter to repository', async () => {
    reports.getCashflowByMonth.mockResolvedValue([]);

    const useCase = new GetCashflowForecastUseCase(reports as never, tenants as never);
    const branchId = '00000000-0000-4000-8000-000000000001';

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      branchId,
    });

    expect(reports.getCashflowByMonth).toHaveBeenCalledWith(
      'tenant-1',
      { branchIds: [branchId] },
      expect.objectContaining({
        from: expect.any(Date),
        toExclusive: expect.any(Date),
      }),
      'Asia/Tehran',
    );
  });

  it('returns zero buckets for branch scope without assigned branches', async () => {
    const useCase = new GetCashflowForecastUseCase(reports as never, tenants as never);

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

    expect(result.data.every((bucket) => bucket.installmentCount === 0)).toBe(true);
    expect(reports.getCashflowByMonth).not.toHaveBeenCalled();
  });

  it('rejects branch filter outside data scope', async () => {
    const useCase = new GetCashflowForecastUseCase(reports as never, tenants as never);

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
