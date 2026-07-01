import type { RoleRecord } from '@hivork/application';

export function toRoleResponse(
  role: RoleRecord,
  extras?: { assignedStaffCount?: number },
) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    isSystem: role.isSystem,
    permissions: role.permissions,
    dataScope: role.dataScope,
    version: role.version,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    ...(extras?.assignedStaffCount !== undefined
      ? { assignedStaffCount: extras.assignedStaffCount }
      : {}),
  };
}
