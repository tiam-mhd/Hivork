import type { RoleRecord, StaffListItem, StaffRecord } from '@hivork/application';

export type RoleEmbed = {
  id?: string;
  code: string;
  name: string;
};

export function buildRoleEmbedMap(roles: RoleRecord[]): Map<string, RoleEmbed> {
  return new Map(
    roles.map((role) => [role.id, { id: role.id, code: role.code, name: role.name }]),
  );
}

export function toStaffMeResponse(
  staff: StaffRecord,
  permissions: string[],
  activeBranchId: string | null,
) {
  return {
    id: staff.id,
    tenantId: staff.tenantId,
    phone: staff.phone,
    name: staff.name,
    status: staff.status,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    primaryBranchId: staff.primaryBranchId,
    activeBranchId,
    permissions,
    lastLoginAt: staff.lastLoginAt?.toISOString() ?? null,
  };
}

export function toStaffResponse(staff: StaffRecord, rolesById: Map<string, RoleEmbed>) {
  return {
    id: staff.id,
    phone: staff.phone,
    name: staff.name,
    email: staff.email,
    jobTitle: staff.jobTitle,
    status: staff.status,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    primaryBranchId: staff.primaryBranchId,
    roles: staff.roleIds
      .map((roleId) => rolesById.get(roleId))
      .filter((role): role is RoleEmbed => role !== undefined),
    lastLoginAt: staff.lastLoginAt?.toISOString() ?? null,
    version: staff.version,
    createdAt: staff.createdAt.toISOString(),
  };
}

export function toStaffListItemResponse(item: StaffListItem) {
  return {
    id: item.id,
    phone: item.phone,
    name: item.name,
    email: item.email,
    jobTitle: item.jobTitle,
    status: item.status,
    dataScope: item.dataScope,
    assignedBranchIds: item.assignedBranchIds,
    primaryBranchId: item.primaryBranchId,
    lastLoginAt: item.lastLoginAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    roleIds: item.roleIds,
  };
}

export function toAssignRoleResponse(result: {
  staffId: string;
  roleId: string;
  role: { code: string; name: string };
  assignedAt: Date;
  created?: boolean;
}) {
  return {
    staffId: result.staffId,
    roleId: result.roleId,
    role: result.role,
    assignedAt: result.assignedAt.toISOString(),
    ...(result.created !== undefined ? { created: result.created } : {}),
  };
}

export function toPermissionOverrideResponse(item: {
  id: string;
  staffId: string;
  permission: string;
  effect: 'grant' | 'deny';
  reason: string;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
}) {
  return {
    id: item.id,
    staffId: item.staffId,
    permission: item.permission,
    effect: item.effect,
    reason: item.reason,
    expiresAt: item.expiresAt?.toISOString() ?? null,
    createdById: item.createdById,
    createdAt: item.createdAt.toISOString(),
  };
}
