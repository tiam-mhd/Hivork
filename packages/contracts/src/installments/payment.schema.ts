import { z } from 'zod';

import { bigintRialNonNegativeSchema, bigintRialStringSchema } from '../common/money.schema.js';

export const PaymentAttemptStatusSchema = z.enum(['pending', 'confirmed', 'rejected', 'voided']);

export type PaymentAttemptStatusDto = z.infer<typeof PaymentAttemptStatusSchema>;

export const ReportPaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialStringSchema,
  note: z.string().trim().max(500).optional(),
});

export type ReportPaymentDto = z.infer<typeof ReportPaymentSchema>;

export {
  ConfirmPaymentResponseSchema,
  ConfirmPaymentSchema,
  type ConfirmPaymentDto,
  type ConfirmPaymentResponseDto,
} from './confirm-payment.schema.js';

export {
  RejectPaymentResponseSchema,
  RejectPaymentSchema,
  type RejectPaymentDto,
  type RejectPaymentResponseDto,
} from './reject-payment.schema.js';

export const PaymentAttemptSchema = z.object({
  id: z.string().uuid(),
  installmentId: z.string().uuid(),
  saleId: z.string().uuid().optional(),
  reportedByType: z.enum(['customer', 'staff']),
  reportedById: z.string().uuid(),
  amountRial: bigintRialNonNegativeSchema,
  note: z.string().nullable().optional(),
  status: PaymentAttemptStatusSchema,
  confirmedAt: z.string().datetime().nullable().optional(),
  rejectedAt: z.string().datetime().nullable().optional(),
  rejectReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type PaymentAttemptDto = z.infer<typeof PaymentAttemptSchema>;

export const ReportPaymentResponseSchema = PaymentAttemptSchema;

export type ReportPaymentResponseDto = z.infer<typeof ReportPaymentResponseSchema>;
