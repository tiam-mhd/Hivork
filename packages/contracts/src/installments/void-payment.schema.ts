import { z } from 'zod';

import { InstallmentStatusSchema } from './installment.schema.js';

export const VoidPaymentSchema = z.object({
  voidReason: z.string().trim().min(3).max(500),
  expectedAttemptVersion: z.number().int().positive(),
  expectedInstallmentVersion: z.number().int().positive(),
});

export type VoidPaymentDto = z.infer<typeof VoidPaymentSchema>;

export const VoidPaymentResponseSchema = z.object({
  paymentAttempt: z.object({
    id: z.string().uuid(),
    status: z.literal('voided'),
    voidReason: z.string(),
    voidedAt: z.string().datetime(),
    version: z.number().int(),
  }),
  installment: z.object({
    id: z.string().uuid(),
    status: InstallmentStatusSchema,
    paidAt: z.string().datetime().nullable(),
    version: z.number().int(),
  }),
});

export type VoidPaymentResponseDto = z.infer<typeof VoidPaymentResponseSchema>;
