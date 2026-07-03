import { z } from 'zod';

import { InstallmentStatusSchema } from './installment.schema.js';

const deferReasonSchema = z.string().trim().min(3).max(500).optional();

export const DeferInstallmentSchema = z.object({
  deferDays: z.number().int().positive(),
  reason: deferReasonSchema,
  expectedVersion: z.number().int().positive(),
});

export type DeferInstallmentDto = z.infer<typeof DeferInstallmentSchema>;

export const DeferInstallmentResponseSchema = z.object({
  installment: z.object({
    id: z.string().uuid(),
    dueDate: z.string().datetime(),
    status: InstallmentStatusSchema,
    version: z.number().int().positive(),
  }),
  operationLogId: z.string().uuid(),
  previousDueDate: z.string().datetime(),
});

export type DeferInstallmentResponseDto = z.infer<typeof DeferInstallmentResponseSchema>;
