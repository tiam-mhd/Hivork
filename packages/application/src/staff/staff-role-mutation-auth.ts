import { hasPermission, resolveEffectivePermissions } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';

export type StaffRoleMutationPermission = 'core.staff.update' | 'core.role.update';

export async function assertStaffUpdateAllowed(
  staff: IStaffRepository,
  permissions: IStaffPermissionsRepository,
  actorId: string,
  tenantId: string,
): Promise<void> {
  if (await staff.isOwner(actorId, tenantId)) {
    return;
  }

  const sources = await permissions.findPermissionSourcesByStaffId(actorId);
  const effective = resolveEffectivePermissions(sources);

  if (hasPermission(effective, 'core.staff.update')) {
    return;
  }

  throw new ApplicationError(
    'PERMISSION_DENIED',
    'You do not have permission to manage staff.',
    403,
  );
}

export async function assertStaffRoleMutationAllowed(
  staff: IStaffRepository,
  permissions: IStaffPermissionsRepository,
  actorId: string,
  tenantId: string,
): Promise<void> {
  if (await staff.isOwner(actorId, tenantId)) {
    return;
  }

  const sources = await permissions.findPermissionSourcesByStaffId(actorId);
  const effective = resolveEffectivePermissions(sources);

  if (
    hasPermission(effective, 'core.staff.update') ||
    hasPermission(effective, 'core.role.update')
  ) {
    return;
  }

  throw new ApplicationError(
    'PERMISSION_DENIED',
    'You do not have permission to manage staff roles.',
    403,
  );
}

export async function assertNotLastOwnerRemoval(
  staffRoles: {
    countStaffWithOwnerRole(tenantId: string): Promise<number>;
  },
  tenantId: string,
  roleCode: string,
): Promise<void> {
  if (roleCode !== 'owner') {
    return;
  }

  const ownerCount = await staffRoles.countStaffWithOwnerRole(tenantId);
  if (ownerCount <= 1) {
    throw new ApplicationError(
      'STAFF_LAST_OWNER',
      'The tenant owner cannot be demoted or unassigned.',
      409,
    );
  }
}
