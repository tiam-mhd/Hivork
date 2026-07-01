import { describe, expect, it, vi } from 'vitest';

import { SetActiveBranchUseCase } from './set-active-branch.use-case.js';

describe('SetActiveBranchUseCase', () => {
  const staffRepository = { findContextById: vi.fn() };
  const activeBranchStore = { set: vi.fn(), get: vi.fn() };
  const useCase = new SetActiveBranchUseCase(staffRepository as never, activeBranchStore, 2_592_000);

  it('stores active branch when staff can access it', async () => {
    staffRepository.findContextById.mockResolvedValue({
      id: 'staff-1',
      tenantId: 'tenant-1',
      phone: '09123456789',
      name: 'Owner',
      status: 'active',
      dataScope: 'branch',
      assignedBranchIds: ['branch-1'],
      primaryBranchId: 'branch-1',
    });

    const result = await useCase.execute({ staffId: 'staff-1', branchId: 'branch-1' });

    expect(result).toEqual({ activeBranchId: 'branch-1' });
    expect(activeBranchStore.set).toHaveBeenCalledWith('staff-1', 'branch-1', 2_592_000);
  });

  it('rejects branch outside assignment', async () => {
    staffRepository.findContextById.mockResolvedValue({
      id: 'staff-1',
      tenantId: 'tenant-1',
      phone: '09123456789',
      name: 'Owner',
      status: 'active',
      dataScope: 'branch',
      assignedBranchIds: ['branch-1'],
      primaryBranchId: 'branch-1',
    });

    await expect(
      useCase.execute({ staffId: 'staff-1', branchId: 'branch-2' }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_ALLOWED', httpStatus: 403 });
  });
});
