import { z } from 'zod';

import { bigintRialStringSchema } from '../common/money.schema.js';
import { PaymentLedgerDirectionSchema, PaymentLedgerEntryTypeSchema } from './list-payment-transactions.schema.js';

export const VoidLedgerTransactionBodySchema = z.object({
  voidReason: z.string().trim().min(1).max(500),
  expectedVersion: z.number().int().min(1),
});

export type VoidLedgerTransactionBodyDto = z.infer<typeof VoidLedgerTransactionBodySchema>;

export const VoidLedgerOriginalEntrySchema = z.object({
  id: z.string().uuid(),
  status: z.literal('voided'),
});

export type VoidLedgerOriginalEntryDto = z.infer<typeof VoidLedgerOriginalEntrySchema>;

export const VoidLedgerReversalEntrySchema = z.object({
  id: z.string().uuid(),
  entryType: PaymentLedgerEntryTypeSchema,
  direction: PaymentLedgerDirectionSchema,
  amountRial: bigintRialStringSchema,
  status: z.literal('posted'),
});

export type VoidLedgerReversalEntryDto = z.infer<typeof VoidLedgerReversalEntrySchema>;

export const VoidLedgerTransactionResponseSchema = z.object({
  originalEntry: VoidLedgerOriginalEntrySchema,
  reversalEntry: VoidLedgerReversalEntrySchema,
  paymentAttemptVoided: z.boolean().optional(),
});

export type VoidLedgerTransactionResponseDto = z.infer<
  typeof VoidLedgerTransactionResponseSchema
>;
