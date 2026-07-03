import { z } from 'zod';

import { bigintRialNonNegativeSchema, dateOnlySchema } from '../common/money.schema.js';
import { InstallmentStatusSchema } from './installment.schema.js';

const mergeReasonSchema = z.string().trim().min(3).max(500);

export const MergeInstallmentsSchema = z
  .object({
    installmentIds: z.array(z.string().uuid()).min(2),
    targetDueDate: dateOnlySchema,
    reason: mergeReasonSchema,
    expectedVersions: z.record(z.string().uuid(), z.number().int().positive()),
  })
  .superRefine((value, ctx) => {
    for (const installmentId of value.installmentIds) {
      if (value.expectedVersions[installmentId] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FIELD_REQUIRED',
          path: ['expectedVersions', installmentId],
        });
      }
    }
  });

export type MergeInstallmentsDto = z.infer<typeof MergeInstallmentsSchema>;

export const MergeInstallmentsResponseSchema = z.object({
  mergedInstallment: z.object({
    id: z.string().uuid(),
    sequenceNumber: z.number().int().positive(),
    dueDate: z.string().datetime(),
    amountRial: bigintRialNonNegativeSchema,
    status: InstallmentStatusSchema,
  }),
  removedInstallmentIds: z.array(z.string().uuid()),
  operationLogId: z.string().uuid(),
});

export type MergeInstallmentsResponseDto = z.infer<typeof MergeInstallmentsResponseSchema>;
