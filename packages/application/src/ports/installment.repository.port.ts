import type { InstallmentStatus, SaleStatus } from '@prisma/client';

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
  metadata: Record<string, unknown> | null;
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

export type InstallmentSaleContext = {
  id: string;
  branchId: string;
  tenantCustomerId: string;
  status: SaleStatus;
  archivedAt: Date | null;
  createdByStaffId: string;
};

export type InstallmentWithSaleRecord = {
  installment: InstallmentRecord;
  sale: InstallmentSaleContext;
};

export type RescheduleInstallmentDueDateInput = {
  tenantId: string;
  installmentId: string;
  newDueDate: Date;
  expectedVersion: number;
  updatedById: string;
  status?: InstallmentStatus;
};

export type RescheduleInstallmentDueDateResult =
  | { outcome: 'updated'; installment: InstallmentRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number };

export type ApplyInstallmentPaymentInput = {
  tenantId: string;
  installmentId: string;
  expectedVersion: number;
  status: InstallmentStatus;
  paidAt: Date | null;
  confirmedByStaffId: string | null;
  metadata: Record<string, unknown> | null;
  updatedById: string;
};

export type ApplyInstallmentPaymentResult =
  | { outcome: 'updated'; installment: InstallmentRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number };

export type WaiveInstallmentPersistenceInput = {
  tenantId: string;
  installmentId: string;
  expectedVersion: number;
  waivedByStaffId: string;
  waiveReason: string;
  updatedById: string;
};

export type WaiveInstallmentPersistenceResult =
  | { outcome: 'updated'; installment: InstallmentRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number }
  | { outcome: 'status_invalid'; status: InstallmentStatus };

export type ApplyInstallmentPenaltyInput = {
  tenantId: string;
  installmentId: string;
  penaltyAmountRial: bigint;
  expectedVersion: number;
  updatedById: string;
};

export type ApplyInstallmentPenaltyResult =
  | { outcome: 'updated'; installment: InstallmentRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number }
  | { outcome: 'status_invalid'; status: InstallmentStatus };

export type ApplyInstallmentDiscountInput = {
  tenantId: string;
  installmentId: string;
  discountAmountRial: bigint;
  expectedVersion: number;
  updatedById: string;
};

export type ApplyInstallmentDiscountResult =
  | { outcome: 'updated'; installment: InstallmentRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number }
  | { outcome: 'status_invalid'; status: InstallmentStatus }
  | { outcome: 'amount_invalid' };

export type SoftDeleteInstallmentsForRegenerateInput = {
  tenantId: string;
  installmentIds: string[];
  deletedById: string;
  deleteReason: string;
};

export type SoftDeleteInstallmentsForMergeInput = SoftDeleteInstallmentsForRegenerateInput;

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
  findByIdWithSale(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<InstallmentWithSaleRecord | null>;
  findByIdsForSale(
    tenantId: string,
    saleId: string,
    installmentIds: string[],
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]>;
  rescheduleDueDate(
    input: RescheduleInstallmentDueDateInput,
    tx?: OutboxTransaction,
  ): Promise<RescheduleInstallmentDueDateResult>;
  applyPaymentConfirm(
    input: ApplyInstallmentPaymentInput,
    tx?: OutboxTransaction,
  ): Promise<ApplyInstallmentPaymentResult>;
  waive(
    input: WaiveInstallmentPersistenceInput,
    tx?: OutboxTransaction,
  ): Promise<WaiveInstallmentPersistenceResult>;
  applyPenaltyAmount(
    input: ApplyInstallmentPenaltyInput,
    tx?: OutboxTransaction,
  ): Promise<ApplyInstallmentPenaltyResult>;
  applyDiscountAmount(
    input: ApplyInstallmentDiscountInput,
    tx?: OutboxTransaction,
  ): Promise<ApplyInstallmentDiscountResult>;
  syncSaleOutstandingRial(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint>;
  getMaxSequenceNumber(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<number>;
  softDeleteForRegenerate(
    input: SoftDeleteInstallmentsForRegenerateInput,
    tx?: OutboxTransaction,
  ): Promise<number>;
  softDeleteForMerge(
    input: SoftDeleteInstallmentsForMergeInput,
    tx?: OutboxTransaction,
  ): Promise<number>;
  list(tenantId: string, options: ListInstallmentsQueryOptions): Promise<ListInstallmentsResult>;
}

export const INSTALLMENT_REPOSITORY = Symbol('INSTALLMENT_REPOSITORY');
