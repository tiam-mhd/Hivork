import { z } from 'zod';

import { bigintRialStringSchema } from '../common/money.schema.js';

export const ApplyDiscountSchema = z.object({
  discountRial: bigintRialStringSchema.refine((value) => BigInt(value) > 0n, {
    message: 'Discount amount must be positive.',
  }),
  reason: z.string().trim().min(3).max(500),
  expectedVersion: z.number().int().positive(),
});

export type ApplyDiscountDto = z.infer<typeof ApplyDiscountSchema>;

export const ApplyDiscountResponseSchema = z.object({
  installment: z.object({
    id: z.string().uuid(),
    amountRial: z.string(),
    version: z.number().int(),
  }),
  adjustment: z.object({
    id: z.string().uuid(),
    adjustmentType: z.literal('discount'),
    amountRial: z.string(),
  }),
});

export type ApplyDiscountResponseDto = z.infer<typeof ApplyDiscountResponseSchema>;
