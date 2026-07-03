import { z } from 'zod';

import { dateOnlySchema } from '../common/money.schema.js';
import { InstallmentStatusSchema } from './installment.schema.js';

const accelerateReasonSchema = z.string().trim().min(3).max(500).optional();

export const AccelerateInstallmentSchema = z.object({
  newDueDate: dateOnlySchema,
  reason: accelerateReasonSchema,
  expectedVersion: z.number().int().positive(),
});

export type AccelerateInstallmentDto = z.infer<typeof AccelerateInstallmentSchema>;

export const AccelerateInstallmentResponseSchema = z.object({
  installment: z.object({
    id: z.string().uuid(),
    dueDate: z.string().datetime(),
    status: InstallmentStatusSchema,
    version: z.number().int().positive(),
  }),
  operationLogId: z.string().uuid(),
  previousDueDate: z.string().datetime(),
});

export type AccelerateInstallmentResponseDto = z.infer<typeof AccelerateInstallmentResponseSchema>;
