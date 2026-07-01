import type { RestoreCommand, SoftDeleteCommand, SoftDeletableRecord } from './soft-deletable.repository.port.js';
import type {
  PreviousStaffLoginSnapshot,
  RecordStaffLoginInput,
  StaffLoginDisplayFields,
} from '../auth/login-snapshot.js';

export type StaffAuthRecord = {
  id: string;
  tenantId: string;
  userId: string;
  phone: string;
  name: string;
  status: 'active' | 'suspended';
};

export type StaffWithTenantRecord = StaffAuthRecord & {
  tenantSlug: string;
  tenantName: string;
  tenantStatus: 'trial' | 'active' | 'suspended';
};

export type StaffContextRecord = StaffAuthRecord & {
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  primaryBranchId: string | null;
};

export type StaffRecord = SoftDeletableRecord & {
  userId: string;
  phone: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  status: 'active' | 'suspended';
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  primaryBranchId: string | null;
  lastLoginAt: Date | null;
  invitedAt: Date | null;
  invitedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  roleIds: string[];
};

export type StaffListItem = {
  id: string;
  userId: string;
  phone: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  status: 'active' | 'suspended';
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  primaryBranchId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  roleIds: string[];
};

export type StaffListSort = 'createdAt:desc' | 'createdAt:asc' | 'name:asc' | 'name:desc';

export type StaffListScope =
  | { dataScope: 'all' }
  | { dataScope: 'branch'; branchIds: string[] }
  | { dataScope: 'own'; staffId: string };

export type StaffCursorPosition = {
  id: string;
  createdAt: Date;
  name?: string;
};

export type ListStaffOptions = {
  cursor?: StaffCursorPosition;
  limit: number;
  sort: StaffListSort;
  status?: 'active' | 'suspended';
  branchId?: string;
  search?: string;
  scope: StaffListScope;
};

export type ListStaffResult = {
  items: StaffListItem[];
  hasMore: boolean;
  total: number;
};

export type CreateStaffPersistenceInput = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  email?: string | null;
  jobTitle?: string | null;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  primaryBranchId?: string | null;
  createdById: string;
  invitedById: string;
  roleIds?: string[];
};

export type UpdateStaffPersistenceInput = {
  id: string;
  tenantId: string;
  updatedById: string;
  name?: string;
  email?: string | null;
  jobTitle?: string | null;
  status?: 'active' | 'suspended';
  dataScope?: 'all' | 'branch' | 'own';
  assignedBranchIds?: string[];
  primaryBranchId?: string | null;
};

export interface IStaffRepository {
  findByTenantSlugAndUserId(
    tenantSlug: string,
    userId: string,
  ): Promise<StaffWithTenantRecord | null>;
  findAllByUserId(userId: string): Promise<StaffWithTenantRecord[]>;
  findById(id: string): Promise<StaffWithTenantRecord | null>;
  findContextById(id: string): Promise<StaffContextRecord | null>;
  updateLastLoginAt(staffId: string): Promise<void>;
  recordStaffLogin(
    staffId: string,
    tenantId: string,
    input: RecordStaffLoginInput,
  ): Promise<PreviousStaffLoginSnapshot>;
  getStaffLoginDisplay(staffId: string, tenantId: string): Promise<StaffLoginDisplayFields | null>;

  findActiveByIdForTenant(id: string, tenantId: string): Promise<StaffRecord | null>;
  findDeletedByIdForTenant(id: string, tenantId: string): Promise<StaffRecord | null>;
  findActiveByUserInTenant(tenantId: string, userId: string): Promise<StaffRecord | null>;
  countActive(tenantId: string): Promise<number>;
  isOwner(staffId: string, tenantId: string): Promise<boolean>;
  create(input: CreateStaffPersistenceInput): Promise<StaffRecord>;
  update(input: UpdateStaffPersistenceInput): Promise<StaffRecord>;
  softDelete(command: SoftDeleteCommand): Promise<StaffRecord>;
  restore(command: RestoreCommand): Promise<StaffRecord>;
  listActive(tenantId: string, options: ListStaffOptions): Promise<ListStaffResult>;
  listDeleted(tenantId: string, limit?: number): Promise<StaffRecord[]>;
}
