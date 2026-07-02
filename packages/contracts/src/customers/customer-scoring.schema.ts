import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';
import { TenantCustomerDetailResponseSchema } from './tenant-customer-detail.schema.js';

/** IFP-052 — manual credit score adjustment */
export const AdjustCustomerScoreSchema = z
  .object({
    delta: z.number().int().min(-1000).max(1000).optional(),
    newScore: z.number().int().min(0).max(1000).optional(),
    reason: z
      .string()
      .trim()
      .min(3, customerValidationMessages.required)
      .max(500, customerValidationMessages.deleteReasonMax),
  })
  .superRefine((data, ctx) => {
    if (data.delta === undefined && data.newScore === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either delta or newScore is required.',
        path: ['delta'],
      });
    }
  });

export type AdjustCustomerScoreDto = z.infer<typeof AdjustCustomerScoreSchema>;

export const AdjustCustomerScoreResponseSchema = TenantCustomerDetailResponseSchema;

export type AdjustCustomerScoreResponseDto = z.infer<typeof AdjustCustomerScoreResponseSchema>;

export const BlacklistCustomerSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, customerValidationMessages.required)
    .max(500, customerValidationMessages.deleteReasonMax),
});

export type BlacklistCustomerDto = z.infer<typeof BlacklistCustomerSchema>;

export const BlacklistCustomerResponseSchema = TenantCustomerDetailResponseSchema;

export type BlacklistCustomerResponseDto = z.infer<typeof BlacklistCustomerResponseSchema>;

export const UnblacklistCustomerSchema = z.object({}).strict();

export type UnblacklistCustomerDto = z.infer<typeof UnblacklistCustomerSchema>;

export const UnblacklistCustomerResponseSchema = TenantCustomerDetailResponseSchema;

export type UnblacklistCustomerResponseDto = z.infer<typeof UnblacklistCustomerResponseSchema>;
