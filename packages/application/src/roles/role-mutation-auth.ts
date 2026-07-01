import { hasPermission, resolveEffectivePermissions } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';

export type RoleMutationPermission =
  | 'core.role.create'
  | 'core.role.update'
  | 'core.role.delete';

export async function assertRoleMutationAllowed(
  staff: IStaffRepository,
  permissions: IStaffPermissionsRepository,
  actorId: string,
  tenantId: string,
  required: RoleMutationPermission,
): Promise<void> {
  if (await staff.isOwner(actorId, tenantId)) {
    return;
  }

  const sources = await permissions.findPermissionSourcesByStaffId(actorId);
  const effective = resolveEffectivePermissions(sources);

  if (!hasPermission(effective, required)) {
    throw new ApplicationError(
      'PERMISSION_DENIED',
      'You do not have permission to manage roles.',
      403,
    );
  }
}

export function assertNotSystemRole(role: { isSystem: boolean }): void {
  if (role.isSystem) {
    throw new ApplicationError(
      'ROLE_IS_SYSTEM',
      'System roles cannot be modified.',
      409,
    );
  }
}
