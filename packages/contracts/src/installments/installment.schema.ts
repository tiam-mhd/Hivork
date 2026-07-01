import { z } from 'zod';

import { bigintRialNonNegativeSchema, dateOnlySchema } from '../common/money.schema.js';
import { phoneSchema } from '../common/phone.schema.js';

export const InstallmentStatusSchema = z.enum(['pending', 'overdue', 'paid', 'waived']);

export type InstallmentStatusDto = z.infer<typeof InstallmentStatusSchema>;

const installmentStatusListSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return value;
  },
  z.array(InstallmentStatusSchema).min(1).optional(),
);

export const ListInstallmentsQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['dueDate:asc', 'dueDate:desc', 'sequenceNumber:asc']).default('dueDate:asc'),
    status: installmentStatusListSchema,
    branchId: z.string().uuid().optional(),
    saleId: z.string().uuid().optional(),
    tenantCustomerId: z.string().uuid().optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VALIDATION_ERROR',
        path: ['to'],
      });
    }
  });

export type ListInstallmentsQueryDto = z.infer<typeof ListInstallmentsQuerySchema>;

export const InstallmentCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().nullable(),
});

export type InstallmentCustomerEmbedDto = z.infer<typeof InstallmentCustomerEmbedSchema>;

export const InstallmentSummarySchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  customer: InstallmentCustomerEmbedSchema,
  branchId: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountRial: bigintRialNonNegativeSchema,
  status: InstallmentStatusSchema,
  paidAt: z.string().datetime().nullable().optional(),
  daysOverdue: z.number().int().nonnegative().optional(),
});

export type InstallmentSummaryDto = z.infer<typeof InstallmentSummarySchema>;

export const InstallmentSaleEmbedSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  status: z.enum(['active', 'completed', 'cancelled']),
  branchId: z.string().uuid(),
  tenantCustomerId: z.string().uuid().optional(),
});

export type InstallmentSaleEmbedDto = z.infer<typeof InstallmentSaleEmbedSchema>;

export const InstallmentDetailSchema = InstallmentSummarySchema.extend({
  sale: InstallmentSaleEmbedSchema,
  confirmedBy: z.string().uuid().nullable().optional(),
  waivedBy: z.string().uuid().nullable().optional(),
  waiveReason: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type InstallmentDetailDto = z.infer<typeof InstallmentDetailSchema>;

export const InstallmentListResponseSchema = z.object({
  data: z.array(InstallmentSummarySchema),
  meta: z.object({
    total: z.number().int().nonnegative().optional(),
    hasNext: z.boolean().optional(),
    nextCursor: z.string().nullable().optional(),
    requestId: z.string().uuid().optional(),
  }),
});

export type InstallmentListResponseDto = z.infer<typeof InstallmentListResponseSchema>;

export const TodayInstallmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TodayInstallmentsQueryDto = z.infer<typeof TodayInstallmentsQuerySchema>;

export const OverdueInstallmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  minDaysOverdue: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['dueDate:asc', 'daysOverdue:desc']).default('daysOverdue:desc'),
});

export type OverdueInstallmentsQueryDto = z.infer<typeof OverdueInstallmentsQuerySchema>;
