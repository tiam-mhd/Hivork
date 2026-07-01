import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { computeDaysOverdue } from './installment-days-overdue.js';
import { ListInstallmentsUseCase } from './list-installments.use-case.js';
import { encodeInstallmentCursor } from './installment-cursor.js';

describe('computeDaysOverdue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zero for paid and future pending', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const futureDue = new Date('2026-07-10T12:00:00.000Z');
    expect(computeDaysOverdue(futureDue, 'pending')).toBe(0);
    expect(computeDaysOverdue(new Date('2026-01-01'), 'paid')).toBe(0);
  });

  it('computes days for defensive pending with past due date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const dueDate = new Date('2026-06-25T12:00:00.000Z');
    expect(computeDaysOverdue(dueDate, 'pending')).toBeGreaterThan(0);
  });

  it('computes overdue days using Asia/Tehran calendar days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T20:30:00.000Z'));

    const dueDate = new Date('2026-06-28T12:00:00.000Z');
    expect(computeDaysOverdue(dueDate, 'overdue')).toBe(2);
  });
});

describe('ListInstallmentsUseCase', () => {
  const installments = { list: vi.fn() };

  const useCase = new ListInstallmentsUseCase(installments);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  const installmentRecord = {
    id: 'inst-1',
    saleId: 'sale-1',
    tenantId: 'tenant-1',
    sequenceNumber: 1,
    dueDate: new Date('2026-08-01'),
    amountRial: 1_000_000n,
    status: 'OVERDUE' as const,
    paidAt: null,
    confirmedByStaffId: null,
    waivedByStaffId: null,
    waiveReason: null,
    version: 1,
    createdAt: new Date('2026-06-29T10:00:00.000Z'),
    updatedAt: new Date('2026-06-29T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installments.list.mockResolvedValue({
      items: [
        {
          installment: installmentRecord,
          branchId: 'branch-1',
          customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
        },
      ],
      hasMore: false,
      total: 1,
    });
  });

  it('applies branch scope via sale join filter', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        ...staffContext,
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
      },
      limit: 20,
      sort: 'dueDate:asc',
    });

    expect(installments.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        branchIds: ['branch-1', 'branch-2'],
      }),
    );
  });

  it('applies own scope via createdByStaffId on sale', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        ...staffContext,
        dataScope: 'own',
      },
      limit: 20,
      sort: 'dueDate:asc',
    });

    expect(installments.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        createdByStaffId: 'staff-1',
      }),
    );
  });

  it('filters by overdue status', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      status: 'overdue',
      limit: 20,
      sort: 'dueDate:asc',
    });

    expect(installments.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        status: 'OVERDUE',
      }),
    );
  });

  it('applies due date range filter', async () => {
    const from = new Date('2026-07-01');
    const to = new Date('2026-12-31');

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      from,
      to,
      limit: 20,
      sort: 'dueDate:asc',
    });

    expect(installments.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ from, to }),
    );
  });

  it('returns pagination meta and daysOverdue in summaries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00.000Z'));

    installments.list.mockResolvedValue({
      items: [
        {
          installment: {
            ...installmentRecord,
            dueDate: new Date('2026-08-01'),
            status: 'OVERDUE',
          },
          branchId: 'branch-1',
          customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
        },
      ],
      hasMore: true,
      total: 5,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      limit: 1,
      sort: 'dueDate:asc',
    });

    expect(result.meta.total).toBe(5);
    expect(result.meta.hasNext).toBe(true);
    expect(result.meta.nextCursor).toBe(
      encodeInstallmentCursor(
        'dueDate:asc',
        installmentRecord.id,
        new Date('2026-08-01'),
        installmentRecord.sequenceNumber,
      ),
    );
    expect(result.data[0]?.daysOverdue).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('rejects invalid cursor', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext,
        cursor: 'bad-cursor',
        limit: 20,
        sort: 'dueDate:asc',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CURSOR',
      httpStatus: 400,
    });
  });

  it('rejects branch outside scope', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext: {
          ...staffContext,
          dataScope: 'branch',
          assignedBranchIds: ['branch-1'],
        },
        branchId: '00000000-0000-0000-0000-000000000099',
        limit: 20,
        sort: 'dueDate:asc',
      }),
    ).rejects.toMatchObject({
      code: 'BRANCH_NOT_ALLOWED',
      httpStatus: 403,
    });
  });
});
