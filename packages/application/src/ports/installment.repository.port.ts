import type { InstallmentStatus } from '@prisma/client';

import type { OutboxTransaction } from './outbox.port.js';
import type { SaleCustomerEmbed } from './sale.repository.port.js';

/**
 * Installment persistence port — TASK-062 / TASK-072.
 *
 * Delete policy (BR-016 / SOFT-DELETE-POLICY §5):
 * - ❌ Hard delete forbidden — Prisma extension throws `INSTALLMENT_CANNOT_DELETE`
 * - ❌ Soft delete forbidden — setting `deletedAt` blocked at extension layer
 * - ✅ Status transitions only: pending|overdue → paid|waived (terminal)
 */
export type InstallmentRecord = {
  id: string;
  saleId: string;
  tenantId: string;
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
  status: InstallmentStatus;
  paidAt: Date | null;
  confirmedByStaffId: string | null;
  waivedByStaffId: string | null;
  waiveReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveInstallmentPersistenceInput = {
  id: string;
  saleId: string;
  tenantId: string;
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
  status: InstallmentStatus;
  createdById: string;
};

export type InstallmentListItem = {
  installment: InstallmentRecord;
  branchId: string;
  customer: SaleCustomerEmbed;
};

export type InstallmentListSort =
  | 'dueDate:asc'
  | 'dueDate:desc'
  | 'sequenceNumber:asc'
  | 'daysOverdue:desc';

export type InstallmentCursorPosition = {
  id: string;
  dueDate?: Date;
  sequenceNumber?: number;
};

export type ListInstallmentsQueryOptions = {
  cursor?: InstallmentCursorPosition;
  limit: number;
  sort: InstallmentListSort;
  status?: InstallmentStatus;
  statuses?: InstallmentStatus[];
  activeSaleOnly?: boolean;
  includeTotalAmountRial?: boolean;
  overdueOnly?: boolean;
  overdueBefore?: Date;
  maxDueDate?: Date;
  branchIds?: string[];
  createdByStaffId?: string;
  saleId?: string;
  tenantCustomerId?: string;
  search?: string;
  from?: Date;
  to?: Date;
};

export type ListInstallmentsResult = {
  items: InstallmentListItem[];
  hasMore: boolean;
  total: number;
  totalAmountRial?: bigint;
};

export type UpdateInstallmentAmountInput = {
  id: string;
  tenantId: string;
  amountRial: bigint;
  updatedById: string;
};

export type RegenerateInstallmentScheduleInput = {
  tenantId: string;
  saleId: string;
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  installmentCount: number;
  firstDueDate: Date;
  intervalDays: number;
  updatedById: string;
};

export interface IInstallmentRepository {
  saveMany(
    inputs: SaveInstallmentPersistenceInput[],
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]>;
  findBySaleId(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]>;
  regeneratePendingAmounts(
    input: RegenerateInstallmentScheduleInput,
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]>;
  list(tenantId: string, options: ListInstallmentsQueryOptions): Promise<ListInstallmentsResult>;
}

export const INSTALLMENT_REPOSITORY = Symbol('INSTALLMENT_REPOSITORY');
