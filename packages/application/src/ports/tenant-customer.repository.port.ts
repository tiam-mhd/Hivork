export type PreferredContactChannel = 'telegram' | 'bale' | 'sms' | 'phone';

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
};

export type DeletedTenantCustomerRecord = TenantCustomerRecord & {
  deletedAt: Date;
  globalCustomer: {
    phone: string;
    name: string | null;
  };
};

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
};

export type TenantCustomerListSort =
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'name:asc'
  | 'name:desc'
  | 'lastPurchaseAt:desc'
  | 'lastPurchaseAt:asc'
  | 'overdueCount:desc'
  | 'overdueCount:asc';

export type TenantCustomerCursorPosition = {
  id: string;
  createdAt?: Date;
  name?: string | null;
  lastPurchaseAt?: Date | null;
  overdueCount?: number;
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
  defaultBranchId?: string;
  scope: TenantCustomerListScope;
  /** Export / bulk selection — must still pass list where + scope guards. */
  ids?: string[];
};

export type ListActiveTenantCustomersResult = {
  items: TenantCustomerListItem[];
  hasMore: boolean;
  total: number;
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
};

export type RestoreTenantCustomerLinkInput = CreateTenantCustomerLinkInput & {
  id: string;
  restoredById: string;
};

export type UpdateTenantCustomerLinkInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  localCode?: string | null;
  tags?: string[];
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  preferredContactChannel?: PreferredContactChannel | null;
  marketingOptIn?: boolean | null;
  metadata?: Record<string, unknown> | null;
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

export interface ITenantCustomerRepository {
  findActiveById(id: string, tenantId: string): Promise<TenantCustomerRecord | null>;
  findDetailById(id: string, tenantId: string): Promise<TenantCustomerDetailRecord | null>;
  findFullDetailById(id: string, tenantId: string): Promise<TenantCustomerFullDetail | null>;
  findDeletedById(id: string, tenantId: string): Promise<TenantCustomerRecord | null>;
  findLinkByGlobalCustomerId(
    tenantId: string,
    globalCustomerId: string,
  ): Promise<TenantCustomerDetailRecord | null>;
  countActive(tenantId: string): Promise<number>;
  createLink(input: CreateTenantCustomerLinkInput): Promise<TenantCustomerDetailRecord>;
  restoreLinkAndUpdate(input: RestoreTenantCustomerLinkInput): Promise<TenantCustomerDetailRecord>;
  softDelete(command: {
    id: string;
    tenantId: string;
    deletedById: string;
    deleteReason?: string;
  }): Promise<TenantCustomerRecord>;
  restore(command: { id: string; tenantId: string; restoredById: string }): Promise<TenantCustomerRecord>;
  listDeleted(tenantId: string, limit?: number): Promise<DeletedTenantCustomerRecord[]>;
  listActive(
    tenantId: string,
    options?: ListActiveTenantCustomersOptions,
  ): Promise<ListActiveTenantCustomersResult>;
  updateLink(input: UpdateTenantCustomerLinkInput): Promise<TenantCustomerDetailRecord>;
}
