import type { OutboxTransaction } from '../../ports/outbox.port.js';
import type { IPaymentReceiptRepository } from '../../ports/payment-receipt.repository.port.js';
import {
  PAYMENT_RECEIPT_SEQUENCE_KEY,
  type ITenantSequenceRepository,
} from '../../ports/tenant-sequence.repository.port.js';
import { formatPaymentReceiptNumber } from './format-payment-receipt-number.js';

export async function resolveOrCreatePaymentReceiptNumber(input: {
  tenantId: string;
  tenantSlug: string;
  paymentAttemptId: string;
  referenceDate: Date;
  createdById: string;
  paymentReceipts: IPaymentReceiptRepository;
  sequences: ITenantSequenceRepository;
  tx?: OutboxTransaction;
}): Promise<{ receiptId: string; receiptNumber: string }> {
  const existing = await input.paymentReceipts.findByPaymentAttemptId(
    input.tenantId,
    input.paymentAttemptId,
    input.tx,
  );

  if (existing) {
    return { receiptId: existing.id, receiptNumber: existing.receiptNumber };
  }

  const sequence = await input.sequences.allocateNextValue(
    input.tenantId,
    PAYMENT_RECEIPT_SEQUENCE_KEY,
    input.tx,
  );
  const receiptNumber = formatPaymentReceiptNumber(
    input.tenantSlug,
    sequence,
    input.referenceDate,
  );

  const created = await input.paymentReceipts.create(
    {
      tenantId: input.tenantId,
      paymentAttemptId: input.paymentAttemptId,
      receiptNumber,
      createdById: input.createdById,
    },
    input.tx,
  );

  return { receiptId: created.id, receiptNumber: created.receiptNumber };
}
