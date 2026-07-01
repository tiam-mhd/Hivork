import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBranchUseCase } from './create-branch.use-case.js';

describe('CreateBranchUseCase', () => {
  const branches = {
    findActiveByName: vi.fn(),
    countActive: vi.fn(),
    create: vi.fn(),
  };
  const tenantPlans = { getMaxBranches: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new CreateBranchUseCase(branches as never, tenantPlans as never, audit);

  beforeEach(() => {
    vi.clearAllMocks();
    tenantPlans.getMaxBranches.mockResolvedValue(10);
    branches.countActive.mockResolvedValue(1);
    branches.findActiveByName.mockResolvedValue(null);
    branches.create.mockResolvedValue({
      id: 'branch-1',
      tenantId: 'tenant-1',
      name: 'شعبه شمال',
      isDefault: false,
      isActive: true,
    });
  });

  it('creates a non-default branch and audits', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      name: 'شعبه شمال',
      address: 'تهران',
      phone: '09121234567',
    });

    expect(result.name).toBe('شعبه شمال');
    expect(branches.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, name: 'شعبه شمال' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'branch.create', entityType: 'branch' }),
    );
  });

  it('rejects when plan branch limit is reached', async () => {
    tenantPlans.getMaxBranches.mockResolvedValue(2);
    branches.countActive.mockResolvedValue(2);

    await expect(
      useCase.execute({ tenantId: 'tenant-1', actorId: 'staff-1', name: 'شعبه جدید' }),
    ).rejects.toMatchObject({ code: 'TENANT_PLAN_LIMIT_EXCEEDED', httpStatus: 403 });
  });

  it('rejects duplicate branch name', async () => {
    branches.findActiveByName.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', actorId: 'staff-1', name: 'شعبه شمال' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 409 });
  });
});
