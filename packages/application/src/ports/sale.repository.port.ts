import type { SaleStatus } from '@prisma/client';

import type { OutboxTransaction } from './outbox.port.js';
import type { RestoreCommand, SoftDeleteCommand } from './soft-deletable.repository.port.js';
import type {
  TenantCustomerSalesSummary,
  TenantCustomerSalesSummaryScope,
} from './tenant-customer.repository.port.js';

/**
 * Sale persistence port — TASK-061 / TASK-072.
 *
 * Soft-delete policy (SOFT-DELETE-POLICY §5):
 * - **Cancel** = `status = CANCELLED` + cancellation fields — record stays visible in history.
 * - **Soft delete** (recycle bin) only when zero installments have `status = PAID`.
 * - Reject soft delete with paid installments → `SALE_HAS_PAID_INSTALLMENT`.
 * - Never hard-delete (`prisma.sale.delete()` forbidden).
 */
export type SaleRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  tenantCustomerId: string;
  createdByStaffId: string;
  title: string | null;
  description: string | null;
  invoiceNumber: string | null;
  contractNumber: string | null;
  customTerms: string | null;
  signatureStatus: 'UNSIGNED' | 'PENDING' | 'SIGNED';
  signedAt: Date | null;
  extendedFromSaleId: string | null;
  copiedFromSaleId: string | null;
  terminatedAt: Date | null;
  terminatedById: string | null;
  terminateReason: string | null;
  closedAt: Date | null;
  closedById: string | null;
  closeReason: string | null;
  archivedAt: Date | null;
  archivedById: string | null;
  archiveReason: string | null;
  insuranceRial: bigint | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiresAt: Date | null;
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  discountRial: bigint | null;
  taxRial: bigint | null;
  taxRateBps: number | null;
  taxInclusive: boolean;
  installmentCount: number;
  firstDueDate: Date;
  intervalDays: number;
  contractDate: Date;
  status: SaleStatus;
  cancelledAt: Date | null;
  cancelledById: string | null;
  cancelReason: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSalePersistenceInput = {
  tenantId: string;
  branchId: string;
  tenantCustomerId: string;
  createdByStaffId: string;
  createdById: string;
  title?: string | null;
  description?: string | null;
  invoiceNumber?: string | null;
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  discountRial?: bigint | null;
  taxRial?: bigint | null;
  installmentCount: number;
  firstDueDate: Date;
  intervalDays: number;
  contractDate: Date;
  metadata?: Record<string, unknown> | null;
};

export type SaveSalePersistenceInput = CreateSalePersistenceInput & {
  id: string;
  status: SaleStatus;
  version: number;
  contractNumber?: string | null;
  copiedFromSaleId?: string | null;
  customTerms?: string | null;
  insuranceRial?: bigint | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiresAt?: Date | null;
  taxRateBps?: number | null;
  taxInclusive?: boolean;
};

export type UpdateSalePersistenceInput = {
  id: string;
  tenantId: string;
  status: SaleStatus;
  cancelledAt: Date | null;
  cancelledById: string | null;
  cancelReason: string | null;
  version: number;
  updatedById: string;
};

export type UpdateSaleFinancialsPersistenceInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  totalAmountRial?: bigint;
  taxRial?: bigint | null;
  taxRateBps?: number | null;
  taxInclusive?: boolean;
  insuranceRial?: bigint | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiresAt?: Date | null;
};

export type ExtendSalePersistenceInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  extendedFromSaleId: string | null;
  installmentCount: number;
  metadata: Record<string, unknown> | null;
};

export type TerminateSalePersistenceInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  terminatedAt: Date;
  terminatedById: string;
  terminateReason: string;
};

export type CloseSalePersistenceInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  closedAt: Date;
  closedById: string;
  closeReason: string;
};

export type ArchiveSalePersistenceInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  archivedAt: Date;
  archivedById: string;
  archiveReason: string;
  metadata: Record<string, unknown> | null;
};

export type UnarchiveSalePersistenceInput = {
  id: string;
  tenantId: string;
  version: number;
  updatedById: string;
  status: SaleStatus;
  metadata: Record<string, unknown> | null;
};

export type SaleCustomerEmbed = {
  id: string;
  phone: string;
  name: string | null;
};

export type SaleListItem = {
  sale: SaleRecord;
  customer: SaleCustomerEmbed;
  paidCount: number;
};

export type SaleDetailRecord = {
  sale: SaleRecord;
  customer: SaleCustomerEmbed;
};

export type SaleListSort = 'createdAt:desc' | 'createdAt:asc' | 'contractDate:desc';

export type SaleCursorPosition = {
  createdAt: Date;
  id: string;
  contractDate?: Date;
};

export type ListSalesQueryOptions = {
  cursor?: SaleCursorPosition;
  limit: number;
  sort: SaleListSort;
  status?: SaleStatus;
  statuses?: SaleStatus[];
  branchIds?: string[];
  createdByStaffId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  /** When false (default), ARCHIVED sales are excluded unless explicitly filtered. */
  includeArchived?: boolean;
  /** Admin recycle-bin view — returns only soft-deleted sales. */
  includeDeleted?: boolean;
  contractNumber?: string;
};

export type ListSalesResult = {
  items: SaleListItem[];
  hasMore: boolean;
};

export interface ISaleRepository {
  save(input: SaveSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  update(input: UpdateSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  updateFinancials(
    input: UpdateSaleFinancialsPersistenceInput,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord>;
  extend(input: ExtendSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  terminate(input: TerminateSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  close(input: CloseSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  archive(input: ArchiveSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  unarchive(input: UnarchiveSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  softDelete(command: SoftDeleteCommand, tx?: OutboxTransaction): Promise<SaleRecord>;
  restore(command: RestoreCommand, tx?: OutboxTransaction): Promise<SaleRecord>;
  findDeletedById(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord | null>;
  findById(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord | null>;
  findDetailById(tenantId: string, saleId: string): Promise<SaleDetailRecord | null>;
  list(tenantId: string, options: ListSalesQueryOptions): Promise<ListSalesResult>;
  countActive(tenantId: string, tx?: OutboxTransaction): Promise<number>;
  hasSaleForTenantCustomerInBranches(
    tenantId: string,
    tenantCustomerId: string,
    branchIds: string[],
  ): Promise<boolean>;
  hasSaleForTenantCustomerByStaff(
    tenantId: string,
    tenantCustomerId: string,
    createdByStaffId: string,
  ): Promise<boolean>;
  getSalesSummaryForTenantCustomer(
    tenantId: string,
    tenantCustomerId: string,
    scope: TenantCustomerSalesSummaryScope,
  ): Promise<TenantCustomerSalesSummary>;
  reassignTenantCustomer(
    tenantId: string,
    sourceTenantCustomerId: string,
    targetTenantCustomerId: string,
    updatedById: string,
    tx?: OutboxTransaction,
  ): Promise<number>;
  countPendingPaymentAttemptsForCustomer(
    tenantId: string,
    tenantCustomerId: string,
  ): Promise<number>;
}

export const SALE_REPOSITORY = Symbol('SALE_REPOSITORY');
