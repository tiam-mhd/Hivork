import { z } from 'zod';

import { InstallmentStatusSchema } from './installment.schema.js';

export const ConfirmPaymentSchema = z.object({
  note: z.string().max(2000).optional(),
  expectedAttemptVersion: z.number().int().positive(),
  expectedInstallmentVersion: z.number().int().positive(),
});

export type ConfirmPaymentDto = z.infer<typeof ConfirmPaymentSchema>;

export const ConfirmPaymentResponseSchema = z.object({
  paymentAttempt: z.object({
    id: z.string().uuid(),
    status: z.literal('confirmed'),
    confirmedAt: z.string().datetime(),
    version: z.number().int(),
  }),
  installment: z.object({
    id: z.string().uuid(),
    status: InstallmentStatusSchema,
    paidAt: z.string().datetime().nullable(),
    version: z.number().int(),
  }),
});

export type ConfirmPaymentResponseDto = z.infer<typeof ConfirmPaymentResponseSchema>;
