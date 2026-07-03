import { z } from 'zod';

export const RejectPaymentSchema = z.object({
  rejectedReason: z.string().trim().min(3).max(500),
  expectedVersion: z.number().int().positive(),
});

export type RejectPaymentDto = z.infer<typeof RejectPaymentSchema>;

export const RejectPaymentResponseSchema = z.object({
  paymentAttempt: z.object({
    id: z.string().uuid(),
    status: z.literal('rejected'),
    rejectedReason: z.string(),
    rejectedAt: z.string().datetime(),
    version: z.number().int(),
  }),
});

export type RejectPaymentResponseDto = z.infer<typeof RejectPaymentResponseSchema>;
