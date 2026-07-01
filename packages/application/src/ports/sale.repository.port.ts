import type { SaleStatus } from '@prisma/client';

import type { OutboxTransaction } from './outbox.port.js';
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
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  discountRial: bigint | null;
  taxRial: bigint | null;
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
};

export type ListSalesResult = {
  items: SaleListItem[];
  hasMore: boolean;
};

export interface ISaleRepository {
  save(input: SaveSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
  update(input: UpdateSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord>;
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
}

export const SALE_REPOSITORY = Symbol('SALE_REPOSITORY');
