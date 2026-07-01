import { UseCase } from '../core/use-case.js';
import type { IRoleRepository, RoleRecord } from '../ports/role.repository.port.js';

export type ListRolesInput = {
  tenantId: string;
};

export type ListRolesOutput = {
  data: RoleRecord[];
};

export class ListRolesUseCase implements UseCase<ListRolesInput, ListRolesOutput> {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(input: ListRolesInput): Promise<ListRolesOutput> {
    const data = await this.roles.listActive(input.tenantId);
    return { data };
  }
}
