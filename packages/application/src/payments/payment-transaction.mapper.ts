import type { PaymentTransactionListItem } from '../ports/payment-ledger.repository.port.js';

export type PaymentTransactionSummary = {
  id: string;
  entryType:
    | 'payment_in'
    | 'payment_out'
    | 'refund'
    | 'fee'
    | 'penalty'
    | 'discount'
    | 'adjustment'
    | 'settlement';
  direction: 'credit' | 'debit';
  amountRial: string;
  status: 'posted' | 'voided';
  paymentMethod: string | null;
  occurredAt: string;
  description: string | null;
  customer: { id: string; displayName: string } | null;
  sale: { id: string; contractNumber: string | null } | null;
  installment: { id: string; sequenceNumber: number } | null;
};

const ENTRY_TYPE_MAP: Record<string, PaymentTransactionSummary['entryType']> = {
  PAYMENT_IN: 'payment_in',
  PAYMENT_OUT: 'payment_out',
  REFUND: 'refund',
  FEE: 'fee',
  PENALTY: 'penalty',
  DISCOUNT: 'discount',
  ADJUSTMENT: 'adjustment',
  SETTLEMENT: 'settlement',
};

const DIRECTION_MAP: Record<string, PaymentTransactionSummary['direction']> = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

const STATUS_MAP: Record<string, PaymentTransactionSummary['status']> = {
  POSTED: 'posted',
  VOIDED: 'voided',
};

export function mapPaymentTransactionListItemToSummary(
  item: PaymentTransactionListItem,
): PaymentTransactionSummary {
  const entryType =
    ENTRY_TYPE_MAP[item.entry.entryType] ?? ('adjustment' as PaymentTransactionSummary['entryType']);
  const direction = DIRECTION_MAP[item.entry.direction] ?? 'credit';
  const status = STATUS_MAP[item.entry.status] ?? 'posted';

  return {
    id: item.entry.id,
    entryType,
    direction,
    amountRial: item.entry.amountRial.toString(),
    status,
    paymentMethod: item.entry.paymentMethod,
    occurredAt: item.entry.occurredAt.toISOString(),
    description: item.entry.description,
    customer: item.customer,
    sale: item.sale,
    installment: item.installment,
  };
}
