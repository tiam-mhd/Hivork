import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateRoleUseCase } from './update-role.use-case.js';

describe('UpdateRoleUseCase', () => {
  const roles = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    update: vi.fn(),
  };
  const staff = { isOwner: vi.fn() };
  const staffPermissions = { findPermissionSourcesByStaffId: vi.fn() };
  const permissionRegistry = { resolvePermissionIds: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new UpdateRoleUseCase(
    roles as never,
    staff as never,
    staffPermissions as never,
    permissionRegistry as never,
    audit,
  );

  const systemRole = {
    id: 'role-owner',
    tenantId: 'tenant-1',
    code: 'owner',
    name: 'مالک',
    isSystem: true,
    dataScope: 'all' as const,
    permissions: ['core.role.view'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    staff.isOwner.mockResolvedValue(true);
    roles.findActiveById.mockResolvedValue(systemRole);
  });

  it('blocks updating system roles', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        roleId: 'role-owner',
        name: 'مالک جدید',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_IS_SYSTEM', httpStatus: 409 });

    expect(roles.update).not.toHaveBeenCalled();
  });
});
