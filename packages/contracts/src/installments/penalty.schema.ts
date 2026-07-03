import { z } from 'zod';

import { bigintRialStringSchema } from '../common/money.schema.js';

const penaltyReasonSchema = z.string().trim().min(3).max(500);
const expectedVersionSchema = z.number().int().positive();

export const ApplyPenaltyManualSchema = z.object({
  mode: z.literal('manual'),
  amountRial: bigintRialStringSchema.refine((value) => BigInt(value) > 0n, {
    message: 'Penalty amount must be positive.',
  }),
  reason: penaltyReasonSchema,
  expectedVersion: expectedVersionSchema,
});

export const ApplyPenaltyAutoSchema = z.object({
  mode: z.literal('auto'),
  reason: penaltyReasonSchema,
  expectedVersion: expectedVersionSchema,
});

export const ApplyPenaltySchema = z.discriminatedUnion('mode', [
  ApplyPenaltyManualSchema,
  ApplyPenaltyAutoSchema,
]);

export type ApplyPenaltyDto = z.infer<typeof ApplyPenaltySchema>;

export const PenaltyPreviewResponseSchema = z.object({
  overdueDays: z.number().int().nonnegative(),
  graceDays: z.number().int().nonnegative(),
  chargeableDays: z.number().int().nonnegative(),
  calculatedPenaltyRial: z.string(),
  cappedByMax: z.boolean(),
});

export type PenaltyPreviewResponseDto = z.infer<typeof PenaltyPreviewResponseSchema>;

export const ApplyPenaltyResponseSchema = z.object({
  adjustment: z.object({
    id: z.string().uuid(),
    amountRial: z.string(),
    reason: z.string(),
    appliedAt: z.string().datetime(),
  }),
  installment: z.object({
    id: z.string().uuid(),
    amountRial: z.string(),
    version: z.number().int(),
  }),
  remainingRial: z.string(),
  operationLogId: z.string().uuid(),
});

export type ApplyPenaltyResponseDto = z.infer<typeof ApplyPenaltyResponseSchema>;
