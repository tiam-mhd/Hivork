import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListTenantCustomersUseCase } from './list-tenant-customers.use-case.js';
import { encodeTenantCustomerCursor } from './tenant-customer-cursor.js';

describe('ListTenantCustomersUseCase', () => {
  const repository = { listActive: vi.fn() };
  const useCase = new ListTenantCustomersUseCase(repository as never);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const listItem = {
    id: 'tc-1',
    globalCustomer: { id: 'global-1', phone: '09123456789', name: 'علی' },
    localCode: 'C-1',
    tags: ['vip'],
    creditScore: 100,
    overdueCount: 1,
    totalPurchaseRial: 1_000n,
    lastPurchaseAt: new Date('2026-01-02T00:00:00.000Z'),
    preferredContactChannel: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists active customers with default limit and sort', async () => {
    repository.listActive.mockResolvedValue({ items: [], hasMore: false, total: 0 });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result).toEqual({
      data: [],
      meta: { total: 0, hasNext: false, nextCursor: null },
    });
    expect(repository.listActive).toHaveBeenCalledWith('tenant-1', {
      limit: 20,
      sort: 'createdAt:desc',
      search: undefined,
      tags: undefined,
      status: 'active',
      defaultBranchId: undefined,
      cursor: undefined,
      scope: { dataScope: 'all', actorId: 'staff-1' },
    });
  });

  it('returns hasNext and nextCursor when page is full', async () => {
    repository.listActive.mockResolvedValue({
      items: [listItem],
      hasMore: true,
      total: 10,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      limit: 1,
    });

    expect(result.meta.hasNext).toBe(true);
    expect(result.meta.nextCursor).toBe(
      encodeTenantCustomerCursor('createdAt:desc', listItem),
    );
  });

  it('passes search and tags filters to repository', async () => {
    repository.listActive.mockResolvedValue({ items: [], hasMore: false, total: 0 });

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext,
      search: '9123',
      tags: ['vip', 'gold'],
      sort: 'name:asc',
    });

    expect(repository.listActive).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        search: '9123',
        tags: ['vip', 'gold'],
        sort: 'name:asc',
      }),
    );
  });

  it('rejects invalid limit', async () => {
    await expect(
      useCase.execute({ tenantId: 'tenant-1', actorId: 'staff-1', limit: 0, staffContext }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects branch outside data scope', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        defaultBranchId: 'branch-2',
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'branch',
          assignedBranchIds: ['branch-1'],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_ALLOWED' });
  });

  it('returns empty list for branch scope without assigned branches', async () => {
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

    expect(result.data).toEqual([]);
    expect(repository.listActive).not.toHaveBeenCalled();
  });

  it('rejects invalid cursor', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext,
        cursor: 'bad-cursor',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
  });
});
