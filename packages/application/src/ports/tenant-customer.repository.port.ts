import type { CustomerAddressRecord } from './customer-address.repository.port.js';
import type { CustomerContactPhoneRecord } from './customer-contact-phone.repository.port.js';
import type { CustomerEmergencyContactRecord } from './customer-emergency-contact.repository.port.js';
import type { OutboxTransaction } from './outbox.port.js';

export type PreferredContactChannel = 'telegram' | 'bale' | 'sms' | 'phone';
export type TenantCustomerStatus = 'active' | 'archived' | 'blacklisted';

export type TenantCustomerRecord = {
  id: string;
  tenantId: string;
  globalCustomerId: string;
  localCode: string | null;
  notes: string | null;
  defaultBranchId: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
};

export type TenantCustomerDetailRecord = TenantCustomerRecord & {
  tags: string[];
  internalNotes: string | null;
  preferredContactChannel: PreferredContactChannel | null;
  marketingOptIn: boolean | null;
  creditScore: number;
  overdueCount: number;
  totalPurchaseRial: bigint;
  lastPurchaseAt: Date | null;
  createdAt: Date;
  createdById: string | null;
  categoryId: string | null;
  status: TenantCustomerStatus;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  assignedStaffId: string | null;
};

export type DeletedTenantCustomerRecord = TenantCustomerRecord & {
  deletedAt: Date;
  globalCustomer: {
    phone: string;
    name: string | null;
  };
};

export type TenantCustomerListLinkStatusFilter =
  | 'active'
  | 'archived'
  | 'blacklisted'
  | 'deleted';

export type TenantCustomerListItem = {
  id: string;
  globalCustomer: {
    id: string;
    phone: string;
    name: string | null;
  };
  localCode: string | null;
  tags: string[];
  creditScore: number;
  overdueCount: number;
  totalPurchaseRial: bigint;
  lastPurchaseAt: Date | null;
  preferredContactChannel: PreferredContactChannel | null;
  createdAt: Date;
  categoryId: string | null;
  categoryName: string | null;
  primaryAddressCity: string | null;
  linkStatus: 'active' | 'archived' | 'blacklisted';
  isBlacklisted: boolean;
};

export type TenantCustomerListSort =
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'name:asc'
  | 'name:desc'
  | 'lastPurchaseAt:desc'
  | 'lastPurchaseAt:asc'
  | 'overdueCount:desc'
  | 'overdueCount:asc'
  | 'creditScore:desc'
  | 'creditScore:asc'
  | 'totalPurchaseRial:desc'
  | 'totalPurchaseRial:asc';

export type TenantCustomerCursorPosition = {
  id: string;
  createdAt?: Date;
  name?: string | null;
  lastPurchaseAt?: Date | null;
  overdueCount?: number;
  creditScore?: number;
  totalPurchaseRial?: bigint;
};

export type TenantCustomerListScope = {
  dataScope: 'all' | 'branch' | 'own';
  actorId: string;
  branchIds?: string[];
};

export type ListActiveTenantCustomersOptions = {
  cursor?: TenantCustomerCursorPosition;
  limit: number;
  sort: TenantCustomerListSort;
  /** Composable where from `buildListWhere` (search + filter + tenant guard). */
  listWhere?: Record<string, unknown>;
  /** @deprecated Use `listWhere` — kept for internal fallbacks */
  search?: string;
  tags?: string[];
  status?: 'active' | 'suspended';
  /** @deprecated Use `branchId` — kept for export compatibility */
  defaultBranchId?: string;
  /** Branch filter — defaultBranch OR sale in branch (IFP-040) */
  branchId?: string;
  categoryId?: string;
  isBlacklisted?: boolean;
  assignedStaffId?: string;
  linkStatus?: TenantCustomerListLinkStatusFilter;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  lastPurchaseAtFrom?: Date;
  lastPurchaseAtTo?: Date;
  scope: TenantCustomerListScope;
  /** Export / bulk selection — must still pass list where + scope guards. */
  ids?: string[];
  /** When false (default), archived customers are excluded from the list. */
  includeArchived?: boolean;
  /** When false (default), skip expensive count query. */
  includeCount?: boolean;
};

export type ListActiveTenantCustomersResult = {
  items: TenantCustomerListItem[];
  hasMore: boolean;
  total?: number;
};

export type CreateTenantCustomerLinkInput = {
  tenantId: string;
  globalCustomerId: string;
  createdById: string;
  localCode?: string | null;
  tags?: string[];
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  preferredContactChannel?: PreferredContactChannel | null;
  marketingOptIn?: boolean | null;
  categoryId?: string | null;
  assignedStaffId?: string | null;
  status?: TenantCustomerStatus;
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
};

export type TenantCustomerDetailWithRelationsRecord = TenantCustomerDetailRecord & {
  addresses: CustomerAddressRecord[];
  emergencyContacts: CustomerEmergencyContactRecord[];
  contactPhones: CustomerContactPhoneRecord[];
};

export type RestoreTenantCustomerLinkInput = CreateTenantCustomerLinkInput & {
  id: string;
  restoredById: string;
};

export type UpdateTenantCustomerLinkInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string | null;
  localCode?: string | null;
  tags?: string[];
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  preferredContactChannel?: PreferredContactChannel | null;
  marketingOptIn?: boolean | null;
  metadata?: Record<string, unknown> | null;
  categoryId?: string | null;
  assignedStaffId?: string | null;
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
  creditScore?: number;
  overdueCount?: number;
  totalPurchaseRial?: bigint;
  lastPurchaseAt?: Date | null;
};

export type TenantCustomerSalesSummary = {
  activeSalesCount: number;
  completedSalesCount: number;
  totalOverdueRial: bigint;
  lastSaleAt: Date | null;
};

export type TenantCustomerSalesSummaryScope = TenantCustomerListScope;

export type TenantCustomerGlobalProfile = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  nationalId: string | null;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'other' | 'unspecified' | null;
  address: string | null;
  status: 'active' | 'suspended';
};

export type TenantCustomerFullDetail = TenantCustomerDetailRecord & {
  globalCustomer: TenantCustomerGlobalProfile;
  metadata: Record<string, unknown> | null;
  updatedAt: Date;
};

export type ArchiveTenantCustomerCommand = {
  id: string;
  tenantId: string;
  archivedById: string;
};

export type UnarchiveTenantCustomerCommand = {
  id: string;
  tenantId: string;
  unarchivedById: string;
};

export interface ITenantCustomerRepository {
  findActiveById(id: string, tenantId: string): Promise<TenantCustomerRecord | null>;
  findDetailById(id: string, tenantId: string): Promise<TenantCustomerDetailRecord | null>;
  findDetailWithRelationsById(
    id: string,
    tenantId: string,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailWithRelationsRecord | null>;
  findFullDetailById(id: string, tenantId: string): Promise<TenantCustomerFullDetail | null>;
  findDeletedById(id: string, tenantId: string): Promise<TenantCustomerRecord | null>;
  findLinkByGlobalCustomerId(
    tenantId: string,
    globalCustomerId: string,
  ): Promise<TenantCustomerDetailRecord | null>;
  countActive(tenantId: string): Promise<number>;
  createLink(
    input: CreateTenantCustomerLinkInput,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailRecord>;
  restoreLinkAndUpdate(
    input: RestoreTenantCustomerLinkInput,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailRecord>;
  softDelete(
    command: {
      id: string;
      tenantId: string;
      deletedById: string;
      deleteReason?: string;
      expectedVersion?: number;
    },
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerRecord>;
  archive(
    command: ArchiveTenantCustomerCommand,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailRecord>;
  unarchive(
    command: UnarchiveTenantCustomerCommand,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailRecord>;
  restore(command: { id: string; tenantId: string; restoredById: string }): Promise<TenantCustomerRecord>;
  listDeleted(tenantId: string, limit?: number): Promise<DeletedTenantCustomerRecord[]>;
  listActive(
    tenantId: string,
    options?: ListActiveTenantCustomersOptions,
  ): Promise<ListActiveTenantCustomersResult>;
  updateLink(
    input: UpdateTenantCustomerLinkInput,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailRecord>;
}
