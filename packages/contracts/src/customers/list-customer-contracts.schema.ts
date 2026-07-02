import { z } from 'zod';

import { CursorPaginationSchema } from '../common/pagination.schema.js';
import { bigintRialNonNegativeSchema, bigintRialStringSchema, dateOnlySchema } from '../common/money.schema.js';

/** UI-friendly sale buckets — maps domain SaleStatus + overdue installments. */
export const CustomerContractStatusSchema = z.enum(['active', 'cancelled', 'closed', 'overdue']);

export type CustomerContractStatusDto = z.infer<typeof CustomerContractStatusSchema>;

export const CustomerContractListItemSchema = z.object({
  saleId: z.string().uuid(),
  title: z.string().nullable(),
  status: CustomerContractStatusSchema,
  totalAmountRial: bigintRialStringSchema,
  paidAmountRial: bigintRialNonNegativeSchema,
  installmentCount: z.number().int().positive(),
  contractDate: dateOnlySchema,
  branchName: z.string().min(1),
  sellerName: z.string().min(1),
  overdueCount: z.number().int().nonnegative(),
});

export type CustomerContractListItemDto = z.infer<typeof CustomerContractListItemSchema>;

export const ListCustomerContractsQuerySchema = CursorPaginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: CustomerContractStatusSchema.optional(),
});

export type ListCustomerContractsQueryDto = z.infer<typeof ListCustomerContractsQuerySchema>;

export const CustomerContractListResponseSchema = z.object({
  data: z.array(CustomerContractListItemSchema),
  meta: z.object({
    hasNext: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type CustomerContractListResponseDto = z.infer<typeof CustomerContractListResponseSchema>;
