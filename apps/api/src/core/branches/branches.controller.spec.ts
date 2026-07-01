import { ApplicationError } from '@hivork/application';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { BranchesController } from './branches.controller.js';

describe('BranchesController', () => {
  const createBranch = { execute: vi.fn() };
  const listBranches = { execute: vi.fn() };
  const getBranch = { execute: vi.fn() };
  const updateBranch = { execute: vi.fn() };
  const softDeleteBranch = { execute: vi.fn() };

  const controller = new BranchesController(
    createBranch as never,
    listBranches as never,
    getBranch as never,
    updateBranch as never,
    softDeleteBranch as never,
  );

  const ownerStaff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  const branchStaff = {
    ...ownerStaff,
    id: 'staff-2',
    dataScope: 'branch' as const,
    assignedBranchIds: ['00000000-0000-4000-8000-000000000001'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists branches with mapped response', async () => {
    listBranches.execute.mockResolvedValue({
      data: [
        {
          id: 'branch-1',
          name: 'شعبه اصلی',
          address: 'تهران',
          phone: '02188888888',
          isDefault: true,
          isActive: true,
          createdAt: new Date('2025-01-01T08:00:00.000Z'),
        },
      ],
      meta: { total: 1, hasNext: false, nextCursor: null },
    });

    const result = await controller.list(ownerStaff, {});

    expect(result.data[0]?.name).toBe('شعبه اصلی');
    expect(result.meta.total).toBe(1);
  });

  it('creates a branch for tenant-wide staff', async () => {
    const createdAt = new Date('2025-01-01T08:00:00.000Z');
    createBranch.execute.mockResolvedValue({
      id: 'branch-2',
      tenantId: 'tenant-1',
      name: 'شعبه غرب',
      address: 'تهران',
      phone: '02144444444',
      isDefault: false,
      isActive: true,
      version: 1,
      createdAt,
      updatedAt: createdAt,
      createdById: 'staff-1',
      updatedById: null,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      metadata: null,
    });

    const result = await controller.create(
      ownerStaff,
      { name: 'شعبه غرب', address: 'تهران', phone: '09124444444' },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result.name).toBe('شعبه غرب');
    expect(createBranch.execute).toHaveBeenCalled();
  });

  it('denies branch mutations for branch-scoped staff', async () => {
    await expect(
      controller.create(
        branchStaff,
        { name: 'شعبه جدید' },
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({
      response: { code: 'PERMISSION_DENIED' },
    });

    expect(createBranch.execute).not.toHaveBeenCalled();
  });

  it('maps application errors from delete', async () => {
    softDeleteBranch.execute.mockRejectedValue(
      new ApplicationError('BRANCH_IS_DEFAULT', 'Default branch cannot be deleted.', 409),
    );

    await expect(
      controller.remove(
        ownerStaff,
        '00000000-0000-4000-8000-000000000001',
        undefined,
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({
      response: { code: 'BRANCH_IS_DEFAULT' },
    });
  });
});
