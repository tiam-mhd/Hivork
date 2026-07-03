import { z } from 'zod';

import { CursorPaginationSchema } from '../common/pagination.schema.js';
import { bigintRialStringSchema, dateOnlySchema } from '../common/money.schema.js';
import { PaymentMethodSchema } from '../installments/payment-recording.schema.js';

export const PaymentLedgerEntryTypeSchema = z.enum([
  'payment_in',
  'payment_out',
  'refund',
  'fee',
  'penalty',
  'discount',
  'adjustment',
  'settlement',
]);

export type PaymentLedgerEntryTypeDto = z.infer<typeof PaymentLedgerEntryTypeSchema>;

export const PaymentLedgerDirectionSchema = z.enum(['credit', 'debit']);

export type PaymentLedgerDirectionDto = z.infer<typeof PaymentLedgerDirectionSchema>;

export const PaymentLedgerEntryStatusSchema = z.enum(['posted', 'voided']);

export type PaymentLedgerEntryStatusDto = z.infer<typeof PaymentLedgerEntryStatusSchema>;

export const ListPaymentTransactionsQuerySchema = CursorPaginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: PaymentLedgerEntryStatusSchema.optional(),
  entryType: PaymentLedgerEntryTypeSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  branchId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  tenantCustomerId: z.string().uuid().optional(),
  occurredFrom: dateOnlySchema.optional(),
  occurredTo: dateOnlySchema.optional(),
  search: z.string().trim().max(100).optional(),
}).omit({ includeDeleted: true });

export type ListPaymentTransactionsQueryDto = z.infer<
  typeof ListPaymentTransactionsQuerySchema
>;

export const PaymentTransactionCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1),
});

export const PaymentTransactionSaleEmbedSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string().nullable(),
});

export const PaymentTransactionInstallmentEmbedSchema = z.object({
  id: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
});

export const PaymentTransactionListItemSchema = z.object({
  id: z.string().uuid(),
  entryType: PaymentLedgerEntryTypeSchema,
  direction: PaymentLedgerDirectionSchema,
  amountRial: bigintRialStringSchema,
  status: PaymentLedgerEntryStatusSchema,
  paymentMethod: z.string().nullable(),
  occurredAt: z.string().datetime(),
  description: z.string().nullable(),
  customer: PaymentTransactionCustomerEmbedSchema.nullable(),
  sale: PaymentTransactionSaleEmbedSchema.nullable(),
  installment: PaymentTransactionInstallmentEmbedSchema.nullable(),
});

export type PaymentTransactionListItemDto = z.infer<typeof PaymentTransactionListItemSchema>;

export const ListPaymentTransactionsResponseSchema = z.object({
  items: z.array(PaymentTransactionListItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ListPaymentTransactionsResponseDto = z.infer<
  typeof ListPaymentTransactionsResponseSchema
>;
