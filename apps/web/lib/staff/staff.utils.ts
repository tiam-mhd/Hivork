import type { RoleResponseDto, StaffListItemDto } from '@hivork/contracts/core';

export const STAFF_LIST_LIMIT = 20;
export const STAFF_LIST_SORT = 'createdAt:desc' as const;

export const STAFF_VIEW_PERMISSION = 'core.staff.view';
export const STAFF_CREATE_PERMISSION = 'core.staff.create';
export const STAFF_UPDATE_PERMISSION = 'core.staff.update';
export const STAFF_DELETE_PERMISSION = 'core.staff.delete';
export const ROLE_VIEW_PERMISSION = 'core.role.view';

export type StaffStatusFilter = 'all' | 'active' | 'suspended';

export type StaffListFilters = {
  search: string;
  status: StaffStatusFilter;
  branchId: string;
};

export const DEFAULT_STAFF_FILTERS: StaffListFilters = {
  search: '',
  status: 'all',
  branchId: '',
};

export function buildStaffQueryString(filters: StaffListFilters, cursor?: string): string {
  const params = new URLSearchParams();
  params.set('limit', String(STAFF_LIST_LIMIT));
  params.set('sort', STAFF_LIST_SORT);

  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }

  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (cursor) {
    params.set('cursor', cursor);
  }

  return `?${params.toString()}`;
}

export function filterStaffBySearch(items: StaffListItemDto[], search: string): StaffListItemDto[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [item.name, item.phone].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export function rolesByIdMap(roles: RoleResponseDto[]): Map<string, RoleResponseDto> {
  return new Map(roles.map((role) => [role.id, role]));
}

export function isStaffOwner(roleIds: string[], rolesById: Map<string, RoleResponseDto>): boolean {
  return roleIds.some((roleId) => rolesById.get(roleId)?.code === 'owner');
}

export function canDeleteStaff(
  staffId: string,
  roleIds: string[],
  rolesById: Map<string, RoleResponseDto>,
  currentStaffId: string | undefined,
): boolean {
  if (currentStaffId && staffId === currentStaffId) {
    return false;
  }

  return !isStaffOwner(roleIds, rolesById);
}

export function canChangeStaffRole(
  roleIds: string[],
  rolesById: Map<string, RoleResponseDto>,
): boolean {
  return !isStaffOwner(roleIds, rolesById);
}

export function resolveRoleEmbeds(
  roleIds: string[],
  rolesById: Map<string, RoleResponseDto>,
): Array<{ id: string; code: string; name: string }> {
  return roleIds
    .map((roleId) => rolesById.get(roleId))
    .filter((role): role is RoleResponseDto => role !== undefined)
    .map((role) => ({ id: role.id, code: role.code, name: role.name }));
}

export function resolveBranchLabels(
  assignedBranchIds: string[],
  branchesById: Map<string, string>,
): string[] {
  if (assignedBranchIds.length === 0) {
    return [];
  }

  return assignedBranchIds
    .map((branchId) => branchesById.get(branchId))
    .filter((name): name is string => Boolean(name));
}

export function mapStaffDeleteError(code: string): string {
  if (code === 'STAFF_LAST_OWNER' || code === 'STAFF_IS_OWNER') {
    return 'مالک tenant قابل حذف نیست.';
  }

  if (code === 'STAFF_CANNOT_DELETE_SELF' || code === 'STAFF_SELF_DELETE') {
    return 'نمی‌توانید حساب خود را حذف کنید.';
  }

  return 'حذف کارمند ناموفق بود.';
}
