import { z } from 'zod';

import { CursorPaginationSchema } from '../common/pagination.schema.js';
import { bigintRialNonNegativeSchema, bigintRialStringSchema } from '../common/money.schema.js';
import { PaymentAttemptStatusSchema } from '../installments/payment.schema.js';

/** Phase 1 default — extended when IFP-104 unified payment methods ship. */
export const CustomerPaymentMethodSchema = z.enum([
  'manual',
  'cash',
  'bank_transfer',
  'online',
  'pos',
  'check',
]);

export type CustomerPaymentMethodDto = z.infer<typeof CustomerPaymentMethodSchema>;

export const CustomerPaymentListItemSchema = z.object({
  paymentId: z.string().uuid(),
  amountRial: bigintRialStringSchema,
  status: PaymentAttemptStatusSchema,
  method: CustomerPaymentMethodSchema,
  confirmedAt: z.string().datetime().nullable(),
  installmentNumber: z.number().int().positive(),
  saleTitle: z.string().nullable(),
  saleId: z.string().uuid(),
});

export type CustomerPaymentListItemDto = z.infer<typeof CustomerPaymentListItemSchema>;

export const CustomerPaymentSummarySchema = z.object({
  totalPaidRial: bigintRialNonNegativeSchema,
  pendingCount: z.number().int().nonnegative(),
});

export type CustomerPaymentSummaryDto = z.infer<typeof CustomerPaymentSummarySchema>;

export const ListCustomerPaymentsQuerySchema = CursorPaginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: PaymentAttemptStatusSchema.optional(),
  occurredFrom: z.string().datetime().optional(),
  occurredTo: z.string().datetime().optional(),
});

export type ListCustomerPaymentsQueryDto = z.infer<typeof ListCustomerPaymentsQuerySchema>;

export const CustomerPaymentListResponseSchema = z.object({
  data: z.array(CustomerPaymentListItemSchema),
  summary: CustomerPaymentSummarySchema,
  meta: z.object({
    hasNext: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type CustomerPaymentListResponseDto = z.infer<typeof CustomerPaymentListResponseSchema>;
