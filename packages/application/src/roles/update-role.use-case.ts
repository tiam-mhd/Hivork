import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPermissionRegistry } from '../ports/permission.registry.port.js';
import type { IRoleRepository, RoleRecord } from '../ports/role.repository.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import { assertNotSystemRole, assertRoleMutationAllowed } from './role-mutation-auth.js';
import { resolveValidatedPermissionIds } from './role-permissions.js';

export type UpdateRoleInput = {
  tenantId: string;
  actorId: string;
  roleId: string;
  name?: string;
  permissions?: string[];
  dataScope?: 'all' | 'branch' | 'own';
  ip?: string;
  userAgent?: string;
};

export type UpdateRoleOutput = RoleRecord;

export class UpdateRoleUseCase implements UseCase<UpdateRoleInput, UpdateRoleOutput> {
  constructor(
    private readonly roles: IRoleRepository,
    private readonly staff: IStaffRepository,
    private readonly staffPermissions: IStaffPermissionsRepository,
    private readonly permissionRegistry: IPermissionRegistry,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateRoleInput): Promise<UpdateRoleOutput> {
    await assertRoleMutationAllowed(
      this.staff,
      this.staffPermissions,
      input.actorId,
      input.tenantId,
      'core.role.update',
    );

    const existing = await this.roles.findActiveById(input.roleId, input.tenantId);
    if (!existing) {
      const deleted = await this.roles.findDeletedById(input.roleId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Role has been deleted.', 404);
      }

      throw new ApplicationError('ROLE_NOT_FOUND', 'Role was not found for this tenant.', 404);
    }

    assertNotSystemRole(existing);

    let permissionIds: string[] | undefined;
    if (input.permissions !== undefined) {
      const resolved = await resolveValidatedPermissionIds(
        this.permissionRegistry,
        input.permissions,
      );
      permissionIds = [...resolved.values()];
    }

    const before = { ...existing };
    const updated = await this.roles.update({
      id: existing.id,
      tenantId: input.tenantId,
      updatedById: input.actorId,
      name: input.name?.trim(),
      dataScope: input.dataScope,
      permissionIds,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'role.update',
      entityType: 'role',
      entityId: updated.id,
      oldValue: this.auditSnapshot(before),
      newValue: this.auditSnapshot(updated),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }

  private auditSnapshot(role: RoleRecord) {
    return {
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      dataScope: role.dataScope,
      permissions: role.permissions,
    };
  }
}
