import type { ColumnPersonalization } from '@hivork/contracts/ui';

export type StaffSavedViewRecord = {
  id: string;
  tenantId: string;
  staffId: string;
  resourceKey: string;
  name: string;
  description: string | null;
  columnState: ColumnPersonalization;
  sortBy: string | null;
  sortDir: 'asc' | 'desc' | null;
  search: string | null;
  savedFilterId: string | null;
  filterAst: import('@hivork/contracts/ui').FilterAst | null;
  isDefault: boolean;
  visibility: 'private' | 'shared';
  ownerName: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
};

export type CreateStaffSavedViewInput = {
  tenantId: string;
  staffId: string;
  resourceKey: string;
  name: string;
  description?: string | null;
  columnState: ColumnPersonalization;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  search?: string | null;
  savedFilterId?: string | null;
  isDefault?: boolean;
  visibility?: 'private' | 'shared';
  createdById: string;
};

export type UpdateStaffSavedViewInput = {
  id: string;
  tenantId: string;
  staffId: string;
  name?: string;
  description?: string | null;
  columnState?: ColumnPersonalization;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  search?: string | null;
  savedFilterId?: string | null;
  isDefault?: boolean;
  visibility?: 'private' | 'shared';
  version: number;
  updatedById: string;
};

export type SoftDeleteStaffSavedViewInput = {
  id: string;
  tenantId: string;
  staffId: string;
  deletedById: string;
  deleteReason?: string;
};

export type RestoreStaffSavedViewInput = {
  id: string;
  tenantId: string;
  staffId: string;
  restoredById: string;
};

export type ListStaffSavedViewsResult = {
  mine: StaffSavedViewRecord[];
  shared: StaffSavedViewRecord[];
};

export interface IStaffSavedViewRepository {
  listAccessible(
    tenantId: string,
    staffId: string,
    resourceKey: string,
    includeShared: boolean,
  ): Promise<ListStaffSavedViewsResult>;

  findOwnedActiveById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedViewRecord | null>;

  findAccessibleById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedViewRecord | null>;

  findDeletedById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedViewRecord | null>;

  findActiveByName(
    tenantId: string,
    staffId: string,
    resourceKey: string,
    name: string,
  ): Promise<StaffSavedViewRecord | null>;

  countActive(tenantId: string, staffId: string, resourceKey: string): Promise<number>;

  create(input: CreateStaffSavedViewInput): Promise<StaffSavedViewRecord>;

  update(input: UpdateStaffSavedViewInput): Promise<StaffSavedViewRecord>;

  softDelete(input: SoftDeleteStaffSavedViewInput): Promise<StaffSavedViewRecord>;

  restore(input: RestoreStaffSavedViewInput): Promise<StaffSavedViewRecord>;
}
