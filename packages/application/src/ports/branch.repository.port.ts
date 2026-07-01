import type {
  RestoreCommand,
  SoftDeleteCommand,
  SoftDeletableRecord,
} from './soft-deletable.repository.port.js';

export type BranchRecord = SoftDeletableRecord & {
  name: string;
  address: string | null;
  phone: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  metadata: Record<string, unknown> | null;
};

export type BranchListItem = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
};

export type BranchListSort = 'createdAt:desc' | 'createdAt:asc' | 'name:asc' | 'name:desc';

export type BranchCursorPosition = {
  id: string;
  createdAt: Date;
  name?: string;
};

export type BranchListScope = {
  dataScope: 'all' | 'branch' | 'own';
  branchIds?: string[];
};

export type ListBranchesOptions = {
  cursor?: BranchCursorPosition;
  limit: number;
  sort: BranchListSort;
  isActive?: boolean;
  scope: BranchListScope;
};

export type ListBranchesResult = {
  items: BranchListItem[];
  hasMore: boolean;
  total: number;
};

export type CreateBranchPersistenceInput = {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdById: string;
  metadata?: Record<string, unknown> | null;
};

export type UpdateBranchPersistenceInput = {
  id: string;
  tenantId: string;
  updatedById: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

export interface IBranchRepository {
  findActiveById(id: string, tenantId: string): Promise<BranchRecord | null>;
  findDeletedById(id: string, tenantId: string): Promise<BranchRecord | null>;
  findActiveByName(tenantId: string, name: string): Promise<BranchRecord | null>;
  countActive(tenantId: string): Promise<number>;
  hasActiveSales(tenantId: string, branchId: string): Promise<boolean>;
  create(input: CreateBranchPersistenceInput): Promise<BranchRecord>;
  update(input: UpdateBranchPersistenceInput): Promise<BranchRecord>;
  softDelete(command: SoftDeleteCommand): Promise<BranchRecord>;
  restore(command: RestoreCommand): Promise<BranchRecord>;
  listActive(tenantId: string, options: ListBranchesOptions): Promise<ListBranchesResult>;
  listDeleted(tenantId: string, limit?: number): Promise<BranchRecord[]>;
}
