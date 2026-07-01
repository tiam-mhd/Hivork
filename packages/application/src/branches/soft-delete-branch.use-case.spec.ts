import { describe, expect, it, vi } from 'vitest';

import { SoftDeleteBranchUseCase } from './soft-delete-branch.use-case.js';

describe('SoftDeleteBranchUseCase', () => {
  const branches = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    countActive: vi.fn(),
    hasActiveSales: vi.fn(),
    softDelete: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const useCase = new SoftDeleteBranchUseCase(branches as never, audit);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const activeBranch = {
    id: 'branch-1',
    tenantId: 'tenant-1',
    name: 'شعبه دوم',
    isDefault: false,
    isActive: true,
  };

  it('rejects deleting default branch', async () => {
    branches.findActiveById.mockResolvedValue({ ...activeBranch, isDefault: true });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        branchId: 'branch-1',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_IS_DEFAULT', httpStatus: 409 });
  });

  it('rejects deleting the last active branch', async () => {
    branches.findActiveById.mockResolvedValue(activeBranch);
    branches.countActive.mockResolvedValue(1);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        branchId: 'branch-1',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'DELETE_FORBIDDEN', httpStatus: 409 });
  });

  it('soft deletes branch when allowed', async () => {
    branches.findActiveById.mockResolvedValue(activeBranch);
    branches.countActive.mockResolvedValue(2);
    branches.hasActiveSales.mockResolvedValue(false);
    branches.softDelete.mockResolvedValue({
      ...activeBranch,
      deletedAt: new Date('2026-06-01T10:00:00.000Z'),
      deletedById: 'staff-1',
      deleteReason: null,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      branchId: 'branch-1',
      staffContext,
    });

    expect(result.id).toBe('branch-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'branch.delete', entityType: 'branch' }),
    );
  });
});
