import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPermissionOverrideRepository } from '../ports/permission-override.repository.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from './staff-data-scope.js';
import { assertStaffUpdateAllowed } from './staff-role-mutation-auth.js';

export type DeletePermissionOverrideInput = {
  tenantId: string;
  actorId: string;
  staffId: string;
  overrideId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type DeletePermissionOverrideOutput = {
  removed: true;
};

export class DeletePermissionOverrideUseCase
  implements UseCase<DeletePermissionOverrideInput, DeletePermissionOverrideOutput>
{
  constructor(
    private readonly staff: IStaffRepository,
    private readonly overrides: IPermissionOverrideRepository,
    private readonly staffPermissions: IStaffPermissionsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: DeletePermissionOverrideInput): Promise<DeletePermissionOverrideOutput> {
    await assertStaffUpdateAllowed(
      this.staff,
      this.staffPermissions,
      input.actorId,
      input.tenantId,
    );

    const staffRecord = await this.staff.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staffRecord) {
      const deleted = await this.staff.findDeletedByIdForTenant(input.staffId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Staff has been deleted.', 404);
      }

      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    assertStaffInScope(staffRecord, input.staffContext);

    const override = await this.overrides.findActiveByIdForStaff(
      input.overrideId,
      staffRecord.id,
      input.tenantId,
    );
    if (!override) {
      throw new ApplicationError(
        'OVERRIDE_NOT_FOUND',
        'Permission override was not found.',
        404,
      );
    }

    const deletedOverride = await this.overrides.softDelete(
      override.id,
      staffRecord.id,
      input.tenantId,
      input.actorId,
    );

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'permission.override.remove',
      entityType: 'staff',
      entityId: staffRecord.id,
      oldValue: {
        overrideId: deletedOverride.id,
        permission: deletedOverride.permission,
        effect: deletedOverride.effect,
        reason: deletedOverride.reason,
        expiresAt: deletedOverride.expiresAt,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { removed: true };
  }
}
