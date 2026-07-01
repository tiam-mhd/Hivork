import { describe, expect, it, vi } from 'vitest';

import { GetStaffPermissionsUseCase } from './get-staff-permissions.use-case.js';

const PERMISSION_CREATE = 'installments.customer.create';
const PERMISSION_VIEW = 'installments.customer.view';

describe('GetStaffPermissionsUseCase', () => {
  it('grants owner role permissions', async () => {
    const repository = {
      findPermissionSourcesByStaffId: vi.fn().mockResolvedValue({
        rolePermissions: [PERMISSION_CREATE, PERMISSION_VIEW],
        grants: [],
        denies: [],
      }),
    };

    const useCase = new GetStaffPermissionsUseCase(repository);
    const effective = await useCase.execute({ staffId: 'owner-staff' });

    expect(useCase.hasPermission(effective, PERMISSION_CREATE)).toBe(true);
  });

  it('denies viewer on create actions', async () => {
    const repository = {
      findPermissionSourcesByStaffId: vi.fn().mockResolvedValue({
        rolePermissions: [PERMISSION_VIEW],
        grants: [],
        denies: [],
      }),
    };

    const useCase = new GetStaffPermissionsUseCase(repository);
    const effective = await useCase.execute({ staffId: 'viewer-staff' });

    expect(useCase.hasPermission(effective, PERMISSION_VIEW)).toBe(true);
    expect(useCase.hasPermission(effective, PERMISSION_CREATE)).toBe(false);
  });

  it('applies user DENY override over role GRANT', async () => {
    const repository = {
      findPermissionSourcesByStaffId: vi.fn().mockResolvedValue({
        rolePermissions: [PERMISSION_CREATE],
        grants: [],
        denies: [PERMISSION_CREATE],
      }),
    };

    const useCase = new GetStaffPermissionsUseCase(repository);
    const effective = await useCase.execute({ staffId: 'staff-with-deny' });

    expect(useCase.hasPermission(effective, PERMISSION_CREATE)).toBe(false);
  });

  it('reads from cache when available', async () => {
    const repository = {
      findPermissionSourcesByStaffId: vi.fn(),
    };
    const cache = {
      get: vi.fn().mockResolvedValue([PERMISSION_CREATE]),
      set: vi.fn(),
    };

    const useCase = new GetStaffPermissionsUseCase(repository, cache);
    const effective = await useCase.execute({ staffId: 'cached-staff' });

    expect(effective).toEqual(new Set([PERMISSION_CREATE]));
    expect(repository.findPermissionSourcesByStaffId).not.toHaveBeenCalled();
  });

  it('stores effective permissions in cache after load', async () => {
    const repository = {
      findPermissionSourcesByStaffId: vi.fn().mockResolvedValue({
        rolePermissions: [PERMISSION_VIEW],
        grants: [],
        denies: [],
      }),
    };
    const cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new GetStaffPermissionsUseCase(repository, cache, 300);
    await useCase.execute({ staffId: 'staff-1' });

    expect(cache.set).toHaveBeenCalledWith('staff-1', [PERMISSION_VIEW], 300);
  });
});
