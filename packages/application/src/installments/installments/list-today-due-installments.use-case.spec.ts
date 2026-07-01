import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { ListInstallmentsUseCase } from './list-installments.use-case.js';
import { ListTodayDueInstallmentsUseCase } from './list-today-due-installments.use-case.js';
import {
  endOfDayInTimezone,
  getTehranTodayUtcRange,
  startOfDayInTimezone,
  TEHRAN_TIMEZONE,
} from './tehran-day-range.js';

describe('tehran-day-range', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps 23:30 UTC to the next Tehran calendar day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T23:30:00.000Z'));

    const { from, to } = getTehranTodayUtcRange();

    expect(from.toISOString()).toBe('2026-06-29T20:30:00.000Z');
    expect(to.toISOString()).toBe('2026-06-30T20:29:59.999Z');
    expect(startOfDayInTimezone(new Date('2026-06-29T23:30:00.000Z'), TEHRAN_TIMEZONE)).toEqual(
      from,
    );
    expect(endOfDayInTimezone(new Date('2026-06-29T23:30:00.000Z'), TEHRAN_TIMEZONE)).toEqual(to);
  });
});

describe('ListTodayDueInstallmentsUseCase', () => {
  const listInstallments = { execute: vi.fn() };
  const useCase = new ListTodayDueInstallmentsUseCase(
    listInstallments as unknown as ListInstallmentsUseCase,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    listInstallments.execute.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        totalAmountRial: '0',
        hasNext: false,
        nextCursor: null,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delegates with Tehran today range and pending/overdue filters', async () => {
    const { from, to } = getTehranTodayUtcRange();

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      limit: 20,
    });

    expect(listInstallments.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      cursor: undefined,
      limit: 20,
      sort: 'dueDate:asc',
      statuses: ['pending', 'overdue'],
      activeSaleOnly: true,
      includeTotalAmountRial: true,
      branchId: undefined,
      activeBranchId: undefined,
      from,
      to,
    });
  });

  it('passes branch scope filters', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      branchId: 'branch-1',
      activeBranchId: 'branch-1',
      limit: 10,
    });

    expect(listInstallments.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-1',
        activeBranchId: 'branch-1',
      }),
    );
  });

  it('returns totalAmountRial in meta', async () => {
    listInstallments.execute.mockResolvedValue({
      data: [
        {
          id: 'inst-1',
          saleId: 'sale-1',
          branchId: 'branch-1',
          sequenceNumber: 1,
          dueDate: new Date().toISOString(),
          amountRial: '2000000',
          status: 'pending',
          customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
        },
      ],
      meta: {
        total: 1,
        totalAmountRial: '2000000',
        hasNext: false,
        nextCursor: null,
      },
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      limit: 20,
    });

    expect(result.meta.totalAmountRial).toBe('2000000');
    expect(result.meta.total).toBe(1);
  });
});
