import { CORE_PERMISSION_CODES } from '../../modules/core/src/core.permissions.ts';
import {
  getInstallmentsPermissionDescription,
  INSTALLMENTS_PERMISSION_CODES,
  OBSOLETE_INSTALLMENTS_PERMISSION_CODES,
} from '../../modules/installments/src/installments.permissions.ts';

/** TASK-028 additions — not yet in module manifests */
export const SEED_EXTRA_PERMISSION_CODES = [
  'core.customer.restore',
  'core.customer.delete',
  'core.recycle.view',
  'core.security.phone.change',
  'core.security.session.view',
  'core.security.session.manage',
  'core.security.apikey.view',
  'core.security.apikey.create',
  'core.security.apikey.revoke',
] as const;

export const ALL_SEED_PERMISSION_CODES = [
  ...CORE_PERMISSION_CODES,
  ...INSTALLMENTS_PERMISSION_CODES,
  ...SEED_EXTRA_PERMISSION_CODES,
] as const;

export { OBSOLETE_INSTALLMENTS_PERMISSION_CODES };

export function parsePermissionCode(code: string) {
  const [module, resource, action] = code.split('.');
  return {
    code,
    module: module ?? 'core',
    resource: resource ?? '',
    action: action ?? '',
  };
}

export function resolvePermissionDescription(code: string): string {
  if ((INSTALLMENTS_PERMISSION_CODES as readonly string[]).includes(code)) {
    return getInstallmentsPermissionDescription(code as (typeof INSTALLMENTS_PERMISSION_CODES)[number]);
  }
  return code;
}
