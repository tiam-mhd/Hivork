import type {
  RestoreCommand,
  SoftDeleteCommand,
  SoftDeletableRecord,
} from './soft-deletable.repository.port.js';

export type RoleRecord = SoftDeletableRecord & {
  code: string;
  name: string;
  isSystem: boolean;
  dataScope: 'all' | 'branch' | 'own';
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
};

export type CreateRolePersistenceInput = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  dataScope: 'all' | 'branch' | 'own';
  permissionIds: string[];
  createdById: string;
};

export type UpdateRolePersistenceInput = {
  id: string;
  tenantId: string;
  updatedById: string;
  name?: string;
  dataScope?: 'all' | 'branch' | 'own';
  permissionIds?: string[];
};

export interface IRoleRepository {
  findActiveById(id: string, tenantId: string): Promise<RoleRecord | null>;
  findDeletedById(id: string, tenantId: string): Promise<RoleRecord | null>;
  findActiveByCode(tenantId: string, code: string): Promise<RoleRecord | null>;
  listActive(tenantId: string): Promise<RoleRecord[]>;
  countActiveStaffAssignments(roleId: string, tenantId: string): Promise<number>;
  create(input: CreateRolePersistenceInput): Promise<RoleRecord>;
  update(input: UpdateRolePersistenceInput): Promise<RoleRecord>;
  softDelete(command: SoftDeleteCommand): Promise<RoleRecord>;
  restore(command: RestoreCommand): Promise<RoleRecord>;
  listDeleted(tenantId: string, limit?: number): Promise<RoleRecord[]>;
}
