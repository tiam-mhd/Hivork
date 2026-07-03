import type { OutboxTransaction } from './outbox.port.js';

export type PaymentReceiptRecord = {
  id: string;
  tenantId: string;
  paymentAttemptId: string;
  receiptNumber: string;
  pdfFileId: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePaymentReceiptInput = {
  tenantId: string;
  paymentAttemptId: string;
  receiptNumber: string;
  createdById: string;
};

export interface IPaymentReceiptRepository {
  findByPaymentAttemptId(
    tenantId: string,
    paymentAttemptId: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentReceiptRecord | null>;

  create(
    input: CreatePaymentReceiptInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentReceiptRecord>;

  markSent(
    tenantId: string,
    id: string,
    sentAt: Date,
    updatedById: string,
    tx?: OutboxTransaction,
  ): Promise<void>;
}

export const PAYMENT_RECEIPT_REPOSITORY = Symbol('PAYMENT_RECEIPT_REPOSITORY');
