import type { PermissionDefinition } from './interfaces/hivork-module.interface.js';

/** Core RBAC permission codes — `docs/02-architecture/rbac.md` § Core Permissions */
export const CORE_PERMISSION_CODES = [
  'core.branch.view',
  'core.branch.create',
  'core.branch.update',
  'core.branch.delete',
  'core.staff.view',
  'core.staff.create',
  'core.staff.update',
  'core.staff.delete',
  'core.role.view',
  'core.role.create',
  'core.role.update',
  'core.role.delete',
  'core.settings.view',
  'core.settings.edit',
  'core.saved_filter.manage',
  'core.saved_view.manage',
  'core.saved_view.share',
  'core.saved_view.use_shared',
] as const;

export type CorePermissionCode = (typeof CORE_PERMISSION_CODES)[number];

export function toPermissionDefinition(code: string): PermissionDefinition {
  const [module, resource, action] = code.split('.');

  return {
    code,
    module: module ?? 'core',
    resource: resource ?? '',
    action: action ?? '',
  };
}

export const CORE_PERMISSIONS: PermissionDefinition[] =
  CORE_PERMISSION_CODES.map(toPermissionDefinition);
