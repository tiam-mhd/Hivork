import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateRoleUseCase } from './create-role.use-case.js';

describe('CreateRoleUseCase', () => {
  const roles = {
    findActiveByCode: vi.fn(),
    create: vi.fn(),
  };
  const staff = { isOwner: vi.fn() };
  const staffPermissions = { findPermissionSourcesByStaffId: vi.fn() };
  const permissionRegistry = { resolvePermissionIds: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new CreateRoleUseCase(
    roles as never,
    staff as never,
    staffPermissions as never,
    permissionRegistry as never,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    staff.isOwner.mockResolvedValue(true);
    roles.findActiveByCode.mockResolvedValue(null);
    permissionRegistry.resolvePermissionIds.mockResolvedValue(
      new Map([['core.branch.view', 'perm-1']]),
    );
    roles.create.mockResolvedValue({
      id: 'role-1',
      code: 'accountant',
      name: 'حسابدار',
      isSystem: false,
      dataScope: 'all',
      permissions: ['core.branch.view'],
    });
  });

  it('rejects invalid permissions', async () => {
    permissionRegistry.resolvePermissionIds.mockRejectedValue({
      code: 'PERMISSION_NOT_FOUND',
      httpStatus: 404,
    });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        code: 'accountant',
        name: 'حسابدار',
        permissions: ['core.branch.view', 'missing.permission.code'],
        dataScope: 'all',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_NOT_FOUND', httpStatus: 404 });
  });

  it('rejects reserved system role codes', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        code: 'owner',
        name: 'مالک جعلی',
        permissions: ['core.branch.view'],
        dataScope: 'all',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_CODE_DUPLICATE', httpStatus: 409 });
  });

  it('rejects empty permissions', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        code: 'accountant',
        name: 'حسابدار',
        permissions: [],
        dataScope: 'all',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 400 });
  });
});
