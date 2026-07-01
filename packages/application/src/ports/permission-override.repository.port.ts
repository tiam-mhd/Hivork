import type { SoftDeletableRecord } from './soft-deletable.repository.port.js';

export type PermissionOverrideEffect = 'grant' | 'deny';

export type PermissionOverrideRecord = SoftDeletableRecord & {
  staffId: string;
  permissionId: string;
  permission: string;
  effect: PermissionOverrideEffect;
  reason: string;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
};

export type CreatePermissionOverridePersistenceInput = {
  id: string;
  staffId: string;
  tenantId: string;
  permissionId: string;
  effect: PermissionOverrideEffect;
  reason: string;
  expiresAt?: Date | null;
  createdById: string;
};

export interface IPermissionOverrideRepository {
  findActiveByIdForStaff(
    id: string,
    staffId: string,
    tenantId: string,
  ): Promise<PermissionOverrideRecord | null>;
  findActiveByStaffAndPermission(
    staffId: string,
    permissionId: string,
    tenantId: string,
  ): Promise<PermissionOverrideRecord | null>;
  listActiveByStaff(staffId: string, tenantId: string): Promise<PermissionOverrideRecord[]>;
  create(input: CreatePermissionOverridePersistenceInput): Promise<PermissionOverrideRecord>;
  softDelete(
    id: string,
    staffId: string,
    tenantId: string,
    deletedById: string,
  ): Promise<PermissionOverrideRecord>;
}
