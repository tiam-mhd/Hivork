import {
  BRANCH_CREATE_PERMISSION,
  BRANCH_VIEW_PERMISSION,
} from '@/lib/branches/branches.utils';
import { hasPermission, permissionSetFromList } from '@/lib/navigation/admin-menu';
import { ROLE_CREATE_PERMISSION } from '@/lib/roles/roles.utils';
import { REMINDERS_SETTINGS_PERMISSION } from '@/lib/settings/reminders-settings.schema';
import {
  STAFF_CREATE_PERMISSION,
  STAFF_VIEW_PERMISSION,
} from '@/lib/staff/staff.utils';

export function canConfigureReminders(permissions: string[] | Set<string>): boolean {
  const set = permissions instanceof Set ? permissions : permissionSetFromList(permissions);
  return hasPermission(set, REMINDERS_SETTINGS_PERMISSION);
}

export function canViewBranches(permissions: string[] | Set<string>): boolean {
  const set = permissions instanceof Set ? permissions : permissionSetFromList(permissions);
  return hasPermission(set, BRANCH_VIEW_PERMISSION);
}

export function canCreateBranch(permissions: string[] | Set<string>): boolean {
  const set = permissions instanceof Set ? permissions : permissionSetFromList(permissions);
  return hasPermission(set, BRANCH_CREATE_PERMISSION);
}

export function canViewStaff(permissions: string[] | Set<string>): boolean {
  const set = permissions instanceof Set ? permissions : permissionSetFromList(permissions);
  return hasPermission(set, STAFF_VIEW_PERMISSION);
}

export function canCreateStaff(permissions: string[] | Set<string>): boolean {
  const set = permissions instanceof Set ? permissions : permissionSetFromList(permissions);
  return hasPermission(set, STAFF_CREATE_PERMISSION);
}

export function canManageRoles(permissions: string[] | Set<string>): boolean {
  const set = permissions instanceof Set ? permissions : permissionSetFromList(permissions);
  return hasPermission(set, ROLE_CREATE_PERMISSION);
}

export { REMINDERS_SETTINGS_PERMISSION };
