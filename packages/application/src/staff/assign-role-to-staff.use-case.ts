import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IRoleRepository } from '../ports/role.repository.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IStaffRoleRepository } from '../ports/staff-role.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from './staff-data-scope.js';
import { assertStaffRoleMutationAllowed } from './staff-role-mutation-auth.js';

export type AssignRoleToStaffInput = {
  tenantId: string;
  actorId: string;
  staffId: string;
  roleId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type AssignRoleToStaffOutput = {
  staffId: string;
  roleId: string;
  role: { code: string; name: string };
  assignedAt: Date;
  created: boolean;
};

export class AssignRoleToStaffUseCase
  implements UseCase<AssignRoleToStaffInput, AssignRoleToStaffOutput>
{
  constructor(
    private readonly staff: IStaffRepository,
    private readonly roles: IRoleRepository,
    private readonly staffRoles: IStaffRoleRepository,
    private readonly staffPermissions: IStaffPermissionsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AssignRoleToStaffInput): Promise<AssignRoleToStaffOutput> {
    await assertStaffRoleMutationAllowed(
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

    const role = await this.roles.findActiveById(input.roleId, input.tenantId);
    if (!role) {
      const deletedRole = await this.roles.findDeletedById(input.roleId, input.tenantId);
      if (deletedRole) {
        throw new ApplicationError('RECORD_DELETED', 'Role has been deleted.', 404);
      }

      throw new ApplicationError('ROLE_NOT_FOUND', 'Role was not found for this tenant.', 404);
    }

    const assignment = await this.staffRoles.assign({
      tenantId: input.tenantId,
      staffId: staffRecord.id,
      roleId: role.id,
    });

    if (assignment.created) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorId,
        action: 'staff.role.assign',
        entityType: 'staff',
        entityId: staffRecord.id,
        newValue: {
          roleId: role.id,
          roleCode: role.code,
          roleName: role.name,
        },
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }

    return {
      staffId: assignment.staffId,
      roleId: assignment.roleId,
      role: assignment.role,
      assignedAt: assignment.assignedAt,
      created: assignment.created,
    };
  }
}
