import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RemoveRoleFromStaffUseCase } from './remove-role-from-staff.use-case.js';

describe('RemoveRoleFromStaffUseCase', () => {
  const staff = {
    findActiveByIdForTenant: vi.fn(),
    findDeletedByIdForTenant: vi.fn(),
    isOwner: vi.fn(),
  };
  const roles = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
  };
  const staffRoles = {
    findActiveAssignment: vi.fn(),
    remove: vi.fn(),
    countStaffWithOwnerRole: vi.fn(),
  };
  const staffPermissions = { findPermissionSourcesByStaffId: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new RemoveRoleFromStaffUseCase(
    staff as never,
    roles as never,
    staffRoles as never,
    staffPermissions as never,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const activeStaff = {
    id: 'staff-2',
    tenantId: 'tenant-1',
    assignedBranchIds: [],
    primaryBranchId: null,
  };

  const ownerRole = {
    id: 'role-owner',
    code: 'owner',
    name: 'مالک',
    isSystem: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    staff.isOwner.mockResolvedValue(true);
    staff.findActiveByIdForTenant.mockResolvedValue(activeStaff);
    roles.findActiveById.mockResolvedValue(ownerRole);
    staffRoles.findActiveAssignment.mockResolvedValue({
      staffId: 'staff-2',
      roleId: 'role-owner',
      role: { code: 'owner', name: 'مالک' },
      assignedAt: new Date(),
    });
    staffRoles.countStaffWithOwnerRole.mockResolvedValue(1);
  });

  it('blocks removing the last owner role', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-2',
        roleId: 'role-owner',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'STAFF_LAST_OWNER', httpStatus: 409 });

    expect(staffRoles.remove).not.toHaveBeenCalled();
  });

  it('removes a non-owner role and audits', async () => {
    roles.findActiveById.mockResolvedValue({
      id: 'role-cashier',
      code: 'cashier',
      name: 'صندوقدار',
      isSystem: true,
    });
    staffRoles.findActiveAssignment.mockResolvedValue({
      staffId: 'staff-2',
      roleId: 'role-cashier',
      role: { code: 'cashier', name: 'صندوقدار' },
      assignedAt: new Date(),
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffId: 'staff-2',
      roleId: 'role-cashier',
      staffContext,
    });

    expect(result.removed).toBe(true);
    expect(staffRoles.remove).toHaveBeenCalledWith('tenant-1', 'staff-2', 'role-cashier');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'staff.role.remove', entityType: 'staff' }),
    );
  });

  it('rejects removing a role that is not assigned', async () => {
    staffRoles.findActiveAssignment.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-2',
        roleId: 'role-owner',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', httpStatus: 404 });
  });
});
