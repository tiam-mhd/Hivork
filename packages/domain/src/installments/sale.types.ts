export enum SaleStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  TERMINATED = 'TERMINATED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export interface SaleProps {
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
  terminatedAt: Date | null;
  terminatedById: string | null;
  terminateReason: string | null;
  closedAt: Date | null;
  closedById: string | null;
  closeReason: string | null;
  archivedAt: Date | null;
  archivedById: string | null;
  archiveReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSaleInput {
  tenantId: string;
  branchId: string;
  tenantCustomerId: string;
  createdByStaffId: string;
  title?: string;
  description?: string;
  invoiceNumber?: string;
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  discountRial?: bigint | null;
  taxRial?: bigint | null;
  installmentCount: number;
  firstDueDate: Date;
  intervalDays: number;
  contractDate: Date;
  metadata?: Record<string, unknown> | null;
}

export const ARCHIVED_FROM_STATUS_METADATA_KEY = 'archivedFromStatus';
