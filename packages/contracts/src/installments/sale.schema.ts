import { z } from 'zod';

import { InstallmentStatusSchema } from './installment.schema.js';
import {
  bigintRialNonNegativeSchema,
  bigintRialStringSchema,
  dateOnlySchema,
} from '../common/money.schema.js';
import { phoneSchema } from '../common/phone.schema.js';

export const CreateSaleSchema = z
  .object({
    tenantCustomerId: z.string().uuid(),
    branchId: z.string().uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    invoiceNumber: z.string().trim().max(50).optional(),
    totalAmountRial: bigintRialStringSchema,
    downPaymentRial: bigintRialNonNegativeSchema.default('0'),
    discountRial: bigintRialNonNegativeSchema.optional(),
    taxRial: bigintRialNonNegativeSchema.optional(),
    installmentCount: z
      .number()
      .int()
      .min(1, 'INSTALLMENT_COUNT_INVALID')
      .max(120, 'INSTALLMENT_COUNT_INVALID'),
    firstDueDate: dateOnlySchema,
    contractDate: dateOnlySchema,
    intervalDays: z.number().int().min(1, 'INTERVAL_INVALID').max(365, 'INTERVAL_INVALID').default(30),
  })
  .superRefine((value, ctx) => {
    const total = BigInt(value.totalAmountRial);
    const down = BigInt(value.downPaymentRial);
    if (down > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AMOUNT_EXCEEDS_TOTAL',
        path: ['downPaymentRial'],
      });
    }

    const remaining = total - down;
    if (remaining === 0n && value.installmentCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INSTALLMENT_COUNT_INVALID',
        path: ['installmentCount'],
      });
    }
  });

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;

export const CancelSaleSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CancelSaleDto = z.infer<typeof CancelSaleSchema>;

const saleStatusListSchema = z.preprocess(
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
  z.array(
    z.enum(['active', 'completed', 'cancelled', 'terminated', 'closed', 'archived']),
  ).min(1).optional(),
);

export const ListSalesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['createdAt:desc', 'createdAt:asc', 'contractDate:desc'])
    .default('createdAt:desc'),
  status: saleStatusListSchema,
  branchId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  includeArchived: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
  contractNumber: z.string().trim().max(50).optional(),
});

export type ListSalesQueryDto = z.infer<typeof ListSalesQuerySchema>;

export const InstallmentInSaleSchema = z.object({
  id: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountRial: bigintRialNonNegativeSchema,
  status: InstallmentStatusSchema,
  paidAt: z.string().datetime().nullable().optional(),
  confirmedBy: z.string().uuid().nullable().optional(),
});

export type InstallmentInSaleDto = z.infer<typeof InstallmentInSaleSchema>;

export const SaleCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().nullable(),
});

export type SaleCustomerEmbedDto = z.infer<typeof SaleCustomerEmbedSchema>;

export const SaleSummarySchema = z.object({
  id: z.string().uuid(),
  tenantCustomerId: z.string().uuid(),
  customer: SaleCustomerEmbedSchema.optional(),
  branchId: z.string().uuid(),
  title: z.string().nullable(),
  totalAmountRial: bigintRialNonNegativeSchema,
  downPaymentRial: bigintRialNonNegativeSchema,
  installmentCount: z.number().int().positive(),
  status: z.enum(['active', 'completed', 'cancelled']),
  paidCount: z.number().int().nonnegative().optional(),
  contractDate: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type SaleSummaryDto = z.infer<typeof SaleSummarySchema>;

export const SaleDetailSchema = SaleSummarySchema.extend({
  description: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  discountRial: bigintRialNonNegativeSchema.nullable().optional(),
  taxRial: bigintRialNonNegativeSchema.nullable().optional(),
  firstDueDate: z.string().datetime().optional(),
  intervalDays: z.number().int().positive().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  installments: z.array(InstallmentInSaleSchema),
  version: z.number().int().positive().optional(),
});

export type SaleDetailDto = z.infer<typeof SaleDetailSchema>;

export const CancelSaleResponseSchema = z.object({
  status: z.literal('cancelled'),
  cancelledAt: z.string().datetime(),
});

export type CancelSaleResponseDto = z.infer<typeof CancelSaleResponseSchema>;

export const SaleListResponseSchema = z.object({
  data: z.array(SaleSummarySchema),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
    hasMore: z.boolean().optional(),
    requestId: z.string().uuid().optional(),
  }),
});

export type SaleListResponseDto = z.infer<typeof SaleListResponseSchema>;
