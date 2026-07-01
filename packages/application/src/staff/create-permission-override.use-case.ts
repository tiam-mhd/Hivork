import { Permission } from '@hivork/domain';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPermissionOverrideRepository } from '../ports/permission-override.repository.port.js';
import type { IPermissionRegistry } from '../ports/permission.registry.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from './staff-data-scope.js';
import { assertStaffUpdateAllowed } from './staff-role-mutation-auth.js';

export type CreatePermissionOverrideInput = {
  tenantId: string;
  actorId: string;
  staffId: string;
  permission: string;
  effect: 'grant' | 'deny';
  reason: string;
  expiresAt?: Date | null;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CreatePermissionOverrideOutput = {
  id: string;
  staffId: string;
  permission: string;
  effect: 'grant' | 'deny';
  reason: string;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
};

export class CreatePermissionOverrideUseCase
  implements UseCase<CreatePermissionOverrideInput, CreatePermissionOverrideOutput>
{
  constructor(
    private readonly staff: IStaffRepository,
    private readonly overrides: IPermissionOverrideRepository,
    private readonly staffPermissions: IStaffPermissionsRepository,
    private readonly permissionRegistry: IPermissionRegistry,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreatePermissionOverrideInput): Promise<CreatePermissionOverrideOutput> {
    await assertStaffUpdateAllowed(
      this.staff,
      this.staffPermissions,
      input.actorId,
      input.tenantId,
    );

    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new ApplicationError('FIELD_REQUIRED', 'Override reason is required.', 400, {
        field: 'reason',
      });
    }

    const staffRecord = await this.staff.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staffRecord) {
      const deleted = await this.staff.findDeletedByIdForTenant(input.staffId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Staff has been deleted.', 404);
      }

      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    assertStaffInScope(staffRecord, input.staffContext);

    if (input.effect === 'deny' && (await this.staff.isOwner(staffRecord.id, input.tenantId))) {
      throw new ApplicationError(
        'DELETE_FORBIDDEN',
        'Owner permissions cannot be denied via override.',
        409,
      );
    }

    try {
      new Permission(input.permission);
    } catch (error) {
      throw mapDomainError(error);
    }

    const permissionIds = await this.permissionRegistry.resolvePermissionIds([input.permission]);
    const permissionId = permissionIds.get(input.permission);
    if (!permissionId) {
      throw new ApplicationError('PERMISSION_NOT_FOUND', 'Permission was not found.', 404);
    }

    const duplicate = await this.overrides.findActiveByStaffAndPermission(
      staffRecord.id,
      permissionId,
      input.tenantId,
    );
    if (duplicate) {
      throw new ApplicationError(
        'OVERRIDE_ALREADY_EXISTS',
        'An active override already exists for this permission.',
        409,
      );
    }

    const created = await this.overrides.create({
      id: randomUUID(),
      staffId: staffRecord.id,
      tenantId: input.tenantId,
      permissionId,
      effect: input.effect,
      reason,
      expiresAt: input.expiresAt ?? null,
      createdById: input.actorId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'permission.override.create',
      entityType: 'staff',
      entityId: staffRecord.id,
      newValue: {
        overrideId: created.id,
        permission: created.permission,
        effect: created.effect,
        reason: created.reason,
        expiresAt: created.expiresAt,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      id: created.id,
      staffId: created.staffId,
      permission: created.permission,
      effect: created.effect,
      reason: created.reason,
      expiresAt: created.expiresAt,
      createdById: created.createdById,
      createdAt: created.createdAt,
    };
  }
}
