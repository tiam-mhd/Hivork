import { z } from 'zod';

import { bigintRialNonNegativeSchema, dateOnlySchema } from '../common/money.schema.js';
import { InstallmentStatusSchema } from './installment.schema.js';

const rescheduleReasonSchema = z.string().trim().min(3).max(500).optional();

export const RescheduleInstallmentSchema = z.object({
  newDueDate: dateOnlySchema,
  reason: rescheduleReasonSchema,
  expectedVersion: z.number().int().positive(),
});

export type RescheduleInstallmentDto = z.infer<typeof RescheduleInstallmentSchema>;

export const RescheduleInstallmentResponseSchema = z.object({
  installment: z.object({
    id: z.string().uuid(),
    sequenceNumber: z.number().int().positive(),
    dueDate: z.string().datetime(),
    amountRial: bigintRialNonNegativeSchema,
    status: InstallmentStatusSchema,
    version: z.number().int().positive(),
  }),
  operationLogId: z.string().uuid(),
});

export type RescheduleInstallmentResponseDto = z.infer<typeof RescheduleInstallmentResponseSchema>;
