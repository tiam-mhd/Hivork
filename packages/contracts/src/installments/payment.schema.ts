import { z } from 'zod';

import { bigintRialNonNegativeSchema, bigintRialStringSchema } from '../common/money.schema.js';

export const PaymentAttemptStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);

export type PaymentAttemptStatusDto = z.infer<typeof PaymentAttemptStatusSchema>;

export const ReportPaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialStringSchema,
  note: z.string().trim().max(500).optional(),
});

export type ReportPaymentDto = z.infer<typeof ReportPaymentSchema>;

export const ConfirmPaymentSchema = z.object({}).strict();

export type ConfirmPaymentDto = z.infer<typeof ConfirmPaymentSchema>;

export const RejectPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type RejectPaymentDto = z.infer<typeof RejectPaymentSchema>;

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

export const ConfirmPaymentResponseSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.literal('confirmed'),
  installment: z.object({
    id: z.string().uuid(),
    status: z.literal('paid'),
    paidAt: z.string().datetime(),
  }),
});

export type ConfirmPaymentResponseDto = z.infer<typeof ConfirmPaymentResponseSchema>;

export const RejectPaymentResponseSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.literal('rejected'),
});

export type RejectPaymentResponseDto = z.infer<typeof RejectPaymentResponseSchema>;

export const ReportPaymentResponseSchema = PaymentAttemptSchema;

export type ReportPaymentResponseDto = z.infer<typeof ReportPaymentResponseSchema>;
