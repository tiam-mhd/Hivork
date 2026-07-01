import type { FilterAst } from '@hivork/contracts/ui';

export type StaffSavedFilterRecord = {
  id: string;
  tenantId: string;
  staffId: string;
  resourceKey: string;
  name: string;
  description: string | null;
  filterAst: FilterAst;
  isDefault: boolean;
  visibility: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
};

export type CreateStaffSavedFilterInput = {
  tenantId: string;
  staffId: string;
  resourceKey: string;
  name: string;
  description?: string | null;
  filterAst: FilterAst;
  isDefault?: boolean;
  visibility?: 'private' | 'shared';
  createdById: string;
};

export type UpdateStaffSavedFilterInput = {
  id: string;
  tenantId: string;
  staffId: string;
  name?: string;
  description?: string | null;
  filterAst?: FilterAst;
  isDefault?: boolean;
  version: number;
  updatedById: string;
};

export type SoftDeleteStaffSavedFilterInput = {
  id: string;
  tenantId: string;
  staffId: string;
  deletedById: string;
  deleteReason?: string;
};

export type RestoreStaffSavedFilterInput = {
  id: string;
  tenantId: string;
  staffId: string;
  restoredById: string;
};

export interface IStaffSavedFilterRepository {
  listActive(
    tenantId: string,
    staffId: string,
    resourceKey: string,
  ): Promise<StaffSavedFilterRecord[]>;

  findActiveById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedFilterRecord | null>;

  findDeletedById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedFilterRecord | null>;

  findActiveByName(
    tenantId: string,
    staffId: string,
    resourceKey: string,
    name: string,
  ): Promise<StaffSavedFilterRecord | null>;

  countActive(tenantId: string, staffId: string, resourceKey: string): Promise<number>;

  create(input: CreateStaffSavedFilterInput): Promise<StaffSavedFilterRecord>;

  update(input: UpdateStaffSavedFilterInput): Promise<StaffSavedFilterRecord>;

  softDelete(input: SoftDeleteStaffSavedFilterInput): Promise<StaffSavedFilterRecord>;

  restore(input: RestoreStaffSavedFilterInput): Promise<StaffSavedFilterRecord>;
}
