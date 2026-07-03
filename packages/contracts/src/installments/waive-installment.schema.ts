import { z } from 'zod';

export const WaiveInstallmentSchema = z.object({
  waiveReason: z.string().trim().min(3).max(500),
  expectedVersion: z.number().int().positive(),
  rejectPendingPayments: z.boolean().default(true),
});

export type WaiveInstallmentDto = z.infer<typeof WaiveInstallmentSchema>;

export const WaiveInstallmentResponseSchema = z.object({
  installment: z.object({
    id: z.string().uuid(),
    status: z.literal('waived'),
    waiveReason: z.string(),
    waivedByStaffId: z.string().uuid(),
    version: z.number().int(),
  }),
  rejectedPaymentAttemptIds: z.array(z.string().uuid()),
  remainingRial: z.string(),
});

export type WaiveInstallmentResponseDto = z.infer<typeof WaiveInstallmentResponseSchema>;
