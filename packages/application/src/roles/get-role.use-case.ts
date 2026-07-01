import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IRoleRepository, RoleRecord } from '../ports/role.repository.port.js';

export type GetRoleInput = {
  tenantId: string;
  roleId: string;
};

export type GetRoleOutput = RoleRecord & {
  assignedStaffCount: number;
};

export class GetRoleUseCase implements UseCase<GetRoleInput, GetRoleOutput> {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(input: GetRoleInput): Promise<GetRoleOutput> {
    const role = await this.roles.findActiveById(input.roleId, input.tenantId);
    if (!role) {
      const deleted = await this.roles.findDeletedById(input.roleId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Role has been deleted.', 404);
      }

      throw new ApplicationError('ROLE_NOT_FOUND', 'Role was not found for this tenant.', 404);
    }

    const assignedStaffCount = await this.roles.countActiveStaffAssignments(
      role.id,
      input.tenantId,
    );

    return { ...role, assignedStaffCount };
  }
}
