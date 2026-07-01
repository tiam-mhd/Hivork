import type { TenantCustomerDetailRecord, TenantCustomerRecord } from '@hivork/application';

type TenantCustomerRow = {
  id: string;
  tenantId: string;
  globalCustomerId: string;
  localCode: string | null;
  notes: string | null;
  internalNotes: string | null;
  defaultBranchId: string | null;
  tags: string[];
  preferredContactChannel: 'telegram' | 'bale' | 'sms' | 'phone' | null;
  marketingOptIn: boolean | null;
  creditScore: number;
  overdueCount: number;
  totalPurchaseRial: bigint;
  lastPurchaseAt: Date | null;
  createdAt: Date;
  createdById: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
};

export function tenantCustomerToRecord(row: TenantCustomerRow): TenantCustomerRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    globalCustomerId: row.globalCustomerId,
    localCode: row.localCode,
    notes: row.notes,
    defaultBranchId: row.defaultBranchId,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
  };
}

export function tenantCustomerToDetailRecord(row: TenantCustomerRow): TenantCustomerDetailRecord {
  return {
    ...tenantCustomerToRecord(row),
    tags: row.tags,
    internalNotes: row.internalNotes,
    preferredContactChannel: row.preferredContactChannel,
    marketingOptIn: row.marketingOptIn,
    creditScore: row.creditScore,
    overdueCount: row.overdueCount,
    totalPurchaseRial: row.totalPurchaseRial,
    lastPurchaseAt: row.lastPurchaseAt,
    createdAt: row.createdAt,
    createdById: row.createdById,
  };
}
