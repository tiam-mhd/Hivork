import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IRoleRepository, RoleRecord } from '../ports/role.repository.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import { assertNotSystemRole, assertRoleMutationAllowed } from './role-mutation-auth.js';

export type SoftDeleteRoleInput = {
  tenantId: string;
  actorId: string;
  roleId: string;
  deleteReason?: string;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteRoleOutput = {
  id: string;
  deletedAt: Date;
};

export class SoftDeleteRoleUseCase
  implements UseCase<SoftDeleteRoleInput, SoftDeleteRoleOutput>
{
  constructor(
    private readonly roles: IRoleRepository,
    private readonly staff: IStaffRepository,
    private readonly staffPermissions: IStaffPermissionsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteRoleInput): Promise<SoftDeleteRoleOutput> {
    await assertRoleMutationAllowed(
      this.staff,
      this.staffPermissions,
      input.actorId,
      input.tenantId,
      'core.role.delete',
    );

    const role = await this.roles.findActiveById(input.roleId, input.tenantId);
    if (!role) {
      const deleted = await this.roles.findDeletedById(input.roleId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Role is already deleted.', 409);
      }

      throw new ApplicationError('ROLE_NOT_FOUND', 'Role was not found for this tenant.', 404);
    }

    assertNotSystemRole(role);

    const assignedCount = await this.roles.countActiveStaffAssignments(role.id, input.tenantId);
    if (assignedCount > 0) {
      throw new ApplicationError(
        'DELETE_FORBIDDEN',
        'Role is assigned to staff and cannot be deleted.',
        409,
        { reason: 'staff_assigned' },
      );
    }

    const deleted = await this.roles.softDelete({
      id: role.id,
      tenantId: input.tenantId,
      deletedById: input.actorId,
      deleteReason: input.deleteReason,
    });

    if (!deleted.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Role is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'role.delete',
      entityType: 'role',
      entityId: role.id,
      oldValue: this.auditSnapshot(role),
      newValue: {
        deletedAt: deleted.deletedAt,
        deletedById: deleted.deletedById,
        deleteReason: deleted.deleteReason,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { id: deleted.id, deletedAt: deleted.deletedAt };
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
