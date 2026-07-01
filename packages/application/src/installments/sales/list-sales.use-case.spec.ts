import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ListSalesUseCase } from './list-sales.use-case.js';
import { encodeSaleCursor } from './sale-cursor.js';

describe('ListSalesUseCase', () => {
  const sales = { list: vi.fn() };

  const useCase = new ListSalesUseCase(sales);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  const baseSale = {
    id: 'sale-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    tenantCustomerId: 'customer-1',
    createdByStaffId: 'staff-1',
    title: 'Test Sale',
    description: null,
    invoiceNumber: null,
    totalAmountRial: 1_000_000n,
    downPaymentRial: 0n,
    discountRial: null,
    taxRial: null,
    installmentCount: 2,
    firstDueDate: new Date('2026-08-01'),
    intervalDays: 30,
    contractDate: new Date('2026-07-01'),
    status: 'ACTIVE' as const,
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 1,
    createdAt: new Date('2026-06-29T10:00:00.000Z'),
    updatedAt: new Date('2026-06-29T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies branch scope filter', async () => {
    sales.list.mockResolvedValue({ items: [], hasMore: false });

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        ...staffContext,
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
      },
      limit: 20,
      sort: 'createdAt:desc',
    });

    expect(sales.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        branchIds: ['branch-1', 'branch-2'],
      }),
    );
  });

  it('applies own scope filter', async () => {
    sales.list.mockResolvedValue({ items: [], hasMore: false });

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        ...staffContext,
        dataScope: 'own',
      },
      limit: 20,
      sort: 'createdAt:desc',
    });

    expect(sales.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        createdByStaffId: 'staff-1',
      }),
    );
  });

  it('returns hasMore and next cursor when page is full', async () => {
    sales.list.mockResolvedValue({
      items: [
        {
          sale: baseSale,
          customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
          paidCount: 1,
        },
      ],
      hasMore: true,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      limit: 1,
      sort: 'createdAt:desc',
    });

    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBe(
      encodeSaleCursor('createdAt:desc', baseSale.createdAt, baseSale.id, baseSale.contractDate),
    );
    expect(result.data[0]?.paidCount).toBe(1);
    expect(result.data[0]?.customer?.phone).toBe('09123456789');
  });

  it('rejects invalid cursor', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext,
        cursor: 'not-a-valid-cursor',
        limit: 20,
        sort: 'createdAt:desc',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CURSOR',
      httpStatus: 400,
    });
  });

  it('intersects active branch header with scope', async () => {
    sales.list.mockResolvedValue({ items: [], hasMore: false });

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        ...staffContext,
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
      },
      activeBranchId: 'branch-2',
      limit: 20,
      sort: 'createdAt:desc',
    });

    expect(sales.list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        branchIds: ['branch-2'],
      }),
    );
  });
});
