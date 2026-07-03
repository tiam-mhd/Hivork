import { z } from 'zod';

import { bigintRialPositiveSchema, bigintRialStringSchema } from '../common/money.schema.js';
import { PaymentLedgerDirectionSchema, PaymentLedgerEntryTypeSchema } from './list-payment-transactions.schema.js';
import { PaymentLedgerEntryStatusSchema } from './list-payment-transactions.schema.js';

export const RefundMethodSchema = z.enum(['original']);

export type RefundMethodDto = z.infer<typeof RefundMethodSchema>;

export const RefundPaymentBodySchema = z.object({
  refundAmountRial: bigintRialPositiveSchema,
  reason: z.string().trim().min(1).max(500),
  refundMethod: RefundMethodSchema.default('original'),
});

export type RefundPaymentBodyDto = z.infer<typeof RefundPaymentBodySchema>;

export const RefundLedgerEntrySchema = z.object({
  id: z.string().uuid(),
  entryType: z.literal('refund'),
  direction: z.literal('debit'),
  amountRial: bigintRialStringSchema,
  status: z.literal('posted'),
});

export type RefundLedgerEntryDto = z.infer<typeof RefundLedgerEntrySchema>;

export const RefundPaymentResponseSchema = z.object({
  refundEntry: RefundLedgerEntrySchema,
  gatewayRefundId: z.string().optional(),
});

export type RefundPaymentResponseDto = z.infer<typeof RefundPaymentResponseSchema>;

/** Internal validation alias — exported entry types for OpenAPI consumers. */
export {
  PaymentLedgerDirectionSchema,
  PaymentLedgerEntryStatusSchema,
  PaymentLedgerEntryTypeSchema,
};
