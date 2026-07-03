import { z } from 'zod';

import { bigintRialNonNegativeSchema, dateOnlySchema } from '../common/money.schema.js';
import { InstallmentStatusSchema } from './installment.schema.js';

export const RegenerateRoundingPolicySchema = z.enum(['last_installment_absorbs_remainder']);

export type RegenerateRoundingPolicyDto = z.infer<typeof RegenerateRoundingPolicySchema>;

const regenerateReasonSchema = z.string().trim().min(3).max(500);

const regenerateScheduleSchema = z
  .object({
    firstDueDate: dateOnlySchema.optional(),
    installmentCount: z.number().int().min(1).max(120).optional(),
    intervalDays: z.number().int().min(1).optional(),
    customDueDates: z.array(dateOnlySchema).min(1).max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.customDueDates?.length) {
      if (value.firstDueDate || value.installmentCount || value.intervalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SCHEDULE_INVALID',
          path: ['customDueDates'],
        });
      }
      return;
    }

    if (!value.firstDueDate || !value.installmentCount || !value.intervalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SCHEDULE_INVALID',
        path: ['firstDueDate'],
      });
    }
  });

export const RegenerateInstallmentsSchema = z.object({
  reason: regenerateReasonSchema,
  schedule: regenerateScheduleSchema,
  roundingPolicy: RegenerateRoundingPolicySchema.default('last_installment_absorbs_remainder'),
});

export type RegenerateInstallmentsDto = z.infer<typeof RegenerateInstallmentsSchema>;

export const RegenerateInstallmentPreviewItemSchema = z.object({
  id: z.string().uuid().optional(),
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountRial: bigintRialNonNegativeSchema,
  status: InstallmentStatusSchema,
});

export const RegenerateInstallmentsPreviewResponseSchema = z.object({
  saleId: z.string().uuid(),
  removedInstallmentIds: z.array(z.string().uuid()),
  newInstallments: z.array(RegenerateInstallmentPreviewItemSchema),
  totalAmountRial: bigintRialNonNegativeSchema,
});

export type RegenerateInstallmentsPreviewResponseDto = z.infer<
  typeof RegenerateInstallmentsPreviewResponseSchema
>;

export const RegenerateInstallmentsResponseSchema = RegenerateInstallmentsPreviewResponseSchema.extend(
  {
    operationLogId: z.string().uuid(),
  },
);

export type RegenerateInstallmentsResponseDto = z.infer<
  typeof RegenerateInstallmentsResponseSchema
>;
