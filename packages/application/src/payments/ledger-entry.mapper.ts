import {
  PaymentLedgerEntry,
  PaymentLedgerDirection,
  PaymentLedgerEntryStatus,
  PaymentLedgerEntryType,
  type PaymentLedgerEntryProps,
} from '@hivork/domain';

import type { PaymentLedgerEntryRecord } from '../ports/payment-ledger.repository.port.js';

export function mapRecordToLedgerEntity(
  sourceEntry: PaymentLedgerEntryRecord,
): PaymentLedgerEntry {
  const props: PaymentLedgerEntryProps = {
    id: sourceEntry.id,
    tenantId: sourceEntry.tenantId,
    branchId: sourceEntry.branchId,
    entryType: sourceEntry.entryType as PaymentLedgerEntryType,
    direction: sourceEntry.direction as PaymentLedgerDirection,
    amountRial: sourceEntry.amountRial,
    status: sourceEntry.status as PaymentLedgerEntryStatus,
    occurredAt: sourceEntry.occurredAt,
    recordedAt: sourceEntry.recordedAt,
    paymentMethod: sourceEntry.paymentMethod,
    description: sourceEntry.description,
    paymentAttemptId: sourceEntry.paymentAttemptId,
    installmentId: sourceEntry.installmentId,
    saleId: sourceEntry.saleId,
    checkId: null,
    settlementBatchId: sourceEntry.settlementBatchId,
    reversesEntryId: sourceEntry.reversesEntryId,
    voidedAt: null,
    voidedById: null,
    voidReason: null,
    version: sourceEntry.version,
    metadata: sourceEntry.metadata,
    createdAt: sourceEntry.recordedAt,
    updatedAt: sourceEntry.recordedAt,
    createdById: null,
  };

  return PaymentLedgerEntry.reconstitute(props);
}

const ENTRY_TYPE_TO_API: Record<string, string> = {
  PAYMENT_IN: 'payment_in',
  PAYMENT_OUT: 'payment_out',
  REFUND: 'refund',
  FEE: 'fee',
  PENALTY: 'penalty',
  DISCOUNT: 'discount',
  ADJUSTMENT: 'adjustment',
  SETTLEMENT: 'settlement',
};

const DIRECTION_TO_API: Record<string, string> = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

export function mapLedgerEntryTypeToApi(entryType: string): string {
  return ENTRY_TYPE_TO_API[entryType] ?? entryType.toLowerCase();
}

export function mapLedgerDirectionToApi(direction: string): string {
  return DIRECTION_TO_API[direction] ?? direction.toLowerCase();
}
