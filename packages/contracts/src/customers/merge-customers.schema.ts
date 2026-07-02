import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';
import { TenantCustomerDetailResponseSchema } from './tenant-customer-detail.schema.js';

/** IFP-050 — merge duplicate customers */
export const MergeCustomersSchema = z
  .object({
    sourceTenantCustomerId: z.string().uuid(customerValidationMessages.uuid),
    targetTenantCustomerId: z.string().uuid(customerValidationMessages.uuid),
    reason: z
      .string()
      .trim()
      .min(3, customerValidationMessages.required)
      .max(500, customerValidationMessages.deleteReasonMax),
  })
  .superRefine((data, ctx) => {
    if (data.sourceTenantCustomerId === data.targetTenantCustomerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'مشتری مبدأ و مقصد نمی‌توانند یکسان باشند.',
        path: ['targetTenantCustomerId'],
      });
    }
  });

export type MergeCustomersDto = z.infer<typeof MergeCustomersSchema>;

export const MergeCustomersResponseSchema = z.object({
  data: TenantCustomerDetailResponseSchema,
  meta: z.object({
    mergedSalesCount: z.number().int().nonnegative(),
    mergedDocumentsCount: z.number().int().nonnegative(),
  }),
});

export type MergeCustomersResponseDto = z.infer<typeof MergeCustomersResponseSchema>;
