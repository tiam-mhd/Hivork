import type { OutboxTransaction } from './outbox.port.js';

export type PaymentLedgerEntryRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  entryType: string;
  direction: string;
  amountRial: bigint;
  status: string;
  occurredAt: Date;
  recordedAt: Date;
  paymentMethod: string | null;
  description: string | null;
  paymentAttemptId: string | null;
  installmentId: string | null;
  saleId: string | null;
  settlementBatchId: string | null;
  reversesEntryId: string | null;
  metadata: Record<string, unknown> | null;
  version: number;
};

export type CreatePaymentLedgerEntryInput = {
  id: string;
  tenantId: string;
  branchId: string;
  entryType: string;
  direction: string;
  amountRial: bigint;
  status: string;
  occurredAt: Date;
  recordedAt: Date;
  paymentMethod?: string | null;
  description?: string | null;
  paymentAttemptId?: string | null;
  installmentId?: string | null;
  saleId?: string | null;
  checkId?: string | null;
  settlementBatchId?: string | null;
  reversesEntryId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdById?: string | null;
};

export type PaymentTransactionCustomerEmbed = {
  id: string;
  displayName: string;
};

export type PaymentTransactionSaleEmbed = {
  id: string;
  contractNumber: string | null;
};

export type PaymentTransactionInstallmentEmbed = {
  id: string;
  sequenceNumber: number;
};

export type PaymentTransactionListItem = {
  entry: PaymentLedgerEntryRecord;
  customer: PaymentTransactionCustomerEmbed | null;
  sale: PaymentTransactionSaleEmbed | null;
  installment: PaymentTransactionInstallmentEmbed | null;
};

export type ListPaymentTransactionsCursor = {
  occurredAt: Date;
  id: string;
};

export type ListPaymentTransactionsQueryOptions = {
  cursor?: ListPaymentTransactionsCursor;
  limit: number;
  status?: 'POSTED' | 'VOIDED';
  entryType?: string;
  paymentMethod?: string;
  branchIds?: string[];
  createdByStaffId?: string;
  saleId?: string;
  tenantCustomerId?: string;
  occurredFrom?: Date;
  occurredTo?: Date;
  search?: string;
};

export type ListPaymentTransactionsResult = {
  items: PaymentTransactionListItem[];
  hasMore: boolean;
};

export interface IPaymentLedgerRepository {
  list(
    tenantId: string,
    options: ListPaymentTransactionsQueryOptions,
  ): Promise<ListPaymentTransactionsResult>;
  findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord | null>;
  create(
    input: CreatePaymentLedgerEntryInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord>;
  sumPostedRefundsForEntry(
    tenantId: string,
    reversesEntryId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint>;
  findRefundByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord | null>;
  markVoided(
    input: MarkPaymentLedgerEntryVoidedInput,
    tx?: OutboxTransaction,
  ): Promise<MarkPaymentLedgerEntryVoidedResult>;
}

export type MarkPaymentLedgerEntryVoidedInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  voidedAt: Date;
  voidedById: string;
  voidReason: string;
  updatedById: string;
};

export type MarkPaymentLedgerEntryVoidedResult =
  | { outcome: 'updated'; entry: PaymentLedgerEntryRecord }
  | { outcome: 'not_found' }
  | { outcome: 'already_voided' }
  | { outcome: 'version_conflict'; currentVersion: number };
