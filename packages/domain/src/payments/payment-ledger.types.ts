export enum PaymentLedgerEntryType {
  PAYMENT_IN = 'PAYMENT_IN',
  PAYMENT_OUT = 'PAYMENT_OUT',
  REFUND = 'REFUND',
  FEE = 'FEE',
  PENALTY = 'PENALTY',
  DISCOUNT = 'DISCOUNT',
  ADJUSTMENT = 'ADJUSTMENT',
  SETTLEMENT = 'SETTLEMENT',
}

export enum PaymentLedgerDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum PaymentLedgerEntryStatus {
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export interface PaymentLedgerEntryProps {
  id: string;
  tenantId: string;
  branchId: string;
  entryType: PaymentLedgerEntryType;
  direction: PaymentLedgerDirection;
  amountRial: bigint;
  status: PaymentLedgerEntryStatus;
  occurredAt: Date;
  recordedAt: Date;
  paymentMethod: string | null;
  description: string | null;
  paymentAttemptId: string | null;
  installmentId: string | null;
  saleId: string | null;
  checkId: string | null;
  settlementBatchId: string | null;
  reversesEntryId: string | null;
  voidedAt: Date | null;
  voidedById: string | null;
  voidReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
}

export interface PostLedgerEntryInput {
  tenantId: string;
  branchId: string;
  entryType: PaymentLedgerEntryType;
  direction: PaymentLedgerDirection;
  amountRial: bigint;
  occurredAt: Date;
  recordedAt?: Date;
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
}

export interface PostPaymentInInput {
  tenantId: string;
  branchId: string;
  amountRial: bigint;
  occurredAt: Date;
  recordedAt?: Date;
  paymentMethod?: string | null;
  description?: string | null;
  paymentAttemptId?: string | null;
  installmentId?: string | null;
  saleId?: string | null;
  checkId?: string | null;
  createdById?: string | null;
}

export interface PostRefundInput {
  tenantId: string;
  branchId: string;
  amountRial: bigint;
  occurredAt: Date;
  recordedAt?: Date;
  paymentMethod?: string | null;
  description?: string | null;
  paymentAttemptId?: string | null;
  installmentId?: string | null;
  saleId?: string | null;
  reversesEntryId: string;
  metadata?: Record<string, unknown> | null;
  createdById?: string | null;
}

export interface VoidLedgerResult {
  original: PaymentLedgerEntryProps;
  reversal: PaymentLedgerEntryProps;
}
