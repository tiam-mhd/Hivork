import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ListInstallmentsUseCase } from './list-installments.use-case.js';
import { ListOverdueInstallmentsUseCase } from './list-overdue-installments.use-case.js';
import {
  endOfTehranDayCalendarDaysBefore,
  startOfDayInTimezone,
  TEHRAN_TIMEZONE,
} from './tehran-day-range.js';

describe('ListOverdueInstallmentsUseCase', () => {
  const listInstallments = { execute: vi.fn() };
  const useCase = new ListOverdueInstallmentsUseCase(
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

  it('delegates with overdue filter, active sales, and default sort', async () => {
    const todayStart = startOfDayInTimezone(new Date('2026-06-29T12:00:00.000Z'), TEHRAN_TIMEZONE);

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
      sort: 'daysOverdue:desc',
      activeSaleOnly: true,
      includeTotalAmountRial: true,
      overdueOnly: true,
      overdueBefore: todayStart,
      maxDueDate: undefined,
      branchId: undefined,
      activeBranchId: undefined,
    });
  });

  it('passes minDaysOverdue as maxDueDate cutoff', async () => {
    const now = new Date('2026-06-29T12:00:00.000Z');

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      minDaysOverdue: 7,
      limit: 10,
    });

    expect(listInstallments.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        maxDueDate: endOfTehranDayCalendarDaysBefore(now, 7),
      }),
    );
  });

  it('passes branch scope filters and custom sort', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      branchId: 'branch-1',
      activeBranchId: 'branch-1',
      sort: 'dueDate:asc',
      limit: 10,
    });

    expect(listInstallments.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-1',
        activeBranchId: 'branch-1',
        sort: 'dueDate:asc',
      }),
    );
  });

  it('maps totalOutstandingRial from totalAmountRial', async () => {
    listInstallments.execute.mockResolvedValue({
      data: [
        {
          id: 'inst-1',
          saleId: 'sale-1',
          branchId: 'branch-1',
          sequenceNumber: 1,
          dueDate: '2026-06-20T00:00:00.000Z',
          amountRial: '3000000',
          status: 'overdue',
          daysOverdue: 9,
          customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
        },
      ],
      meta: {
        total: 1,
        totalAmountRial: '3000000',
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

    expect(result.meta.totalOutstandingRial).toBe('3000000');
    expect(result.meta.total).toBe(1);
    expect(result.data[0]?.daysOverdue).toBe(9);
  });

  it('rejects invalid limit', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext,
        limit: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
