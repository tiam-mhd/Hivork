import { z } from 'zod';

import { bigintRialStringSchema, dateOnlySchema } from '../common/money.schema.js';

const splitReasonSchema = z.string().trim().min(3).max(500);

const splitPartSchema = z.object({
  amountRial: bigintRialStringSchema,
  dueDate: dateOnlySchema,
});

const splitBaseSchema = z.object({
  reason: splitReasonSchema,
  expectedVersion: z.number().int().positive(),
});

export const SplitInstallmentExplicitSchema = splitBaseSchema.extend({
  parts: z.array(splitPartSchema).min(2),
});

export const SplitInstallmentEqualSchema = splitBaseSchema.extend({
  partCount: z.number().int().min(2).max(120),
  firstDueDate: dateOnlySchema,
  intervalDays: z.number().int().min(1),
});

export const SplitInstallmentSchema = z.union([
  SplitInstallmentExplicitSchema,
  SplitInstallmentEqualSchema,
]);

export type SplitInstallmentExplicitDto = z.infer<typeof SplitInstallmentExplicitSchema>;
export type SplitInstallmentEqualDto = z.infer<typeof SplitInstallmentEqualSchema>;
export type SplitInstallmentDto = z.infer<typeof SplitInstallmentSchema>;

export const SplitInstallmentResponseSchema = z.object({
  originalInstallmentId: z.string().uuid(),
  newInstallments: z.array(
    z.object({
      id: z.string().uuid(),
      sequenceNumber: z.number().int().positive(),
      amountRial: bigintRialStringSchema,
      dueDate: z.string().datetime(),
    }),
  ),
  operationLogId: z.string().uuid(),
});

export type SplitInstallmentResponseDto = z.infer<typeof SplitInstallmentResponseSchema>;
