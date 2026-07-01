import { z } from 'zod';

import { ExportRequestSchema } from '../core/export.schema.js';
import { parseFilterQueryParam } from '../core/list-query.schema.js';
import { PreferredContactChannelSchema, TenantCustomerStatusSchema } from './tenant-customer-base.schema.js';
import type { FilterAst } from '../ui/filter-ast.schema.js';

export const TenantCustomerListSortSchema = z.enum([
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'lastPurchaseAt:desc',
  'lastPurchaseAt:asc',
  'overdueCount:desc',
  'overdueCount:asc',
]);

export type TenantCustomerListSortDto = z.infer<typeof TenantCustomerListSortSchema>;

export const ListCustomersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: TenantCustomerListSortSchema.default('createdAt:desc'),
  search: z.string().trim().max(200).optional(),
  filter: z
    .string()
    .optional()
    .transform((value, ctx): FilterAst | undefined => {
      if (!value?.trim()) {
        return undefined;
      }

      const ast = parseFilterQueryParam(value);
      if (!ast) {
        ctx.addIssue({
          code: 'custom',
          message: 'FILTER_INVALID',
        });
        return z.NEVER;
      }

      return ast;
    }),
  status: TenantCustomerStatusSchema.optional(),
  tags: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) =>
      value
        ? [
            ...new Set(
              value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ]
        : undefined,
    ),
  defaultBranchId: z.string().uuid().optional(),
});

export type ListCustomersQueryDto = z.infer<typeof ListCustomersQuerySchema>;

export const TenantCustomerListItemSchema = z.object({
  id: z.string().uuid(),
  globalCustomer: z.object({
    id: z.string().uuid(),
    phone: z.string(),
    name: z.string().nullable(),
  }),
  localCode: z.string().nullable(),
  tags: z.array(z.string()),
  creditScore: z.number().int().min(0).max(100),
  overdueCount: z.number().int().nonnegative(),
  totalPurchaseRial: z.string(),
  lastPurchaseAt: z.string().datetime().nullable(),
  preferredContactChannel: PreferredContactChannelSchema.nullable(),
  createdAt: z.string().datetime(),
});

export type TenantCustomerListItemDto = z.infer<typeof TenantCustomerListItemSchema>;

export const TenantCustomerListResponseSchema = z.object({
  data: z.array(TenantCustomerListItemSchema),
  meta: z.object({
    total: z.number().int().nonnegative().optional(),
    hasNext: z.boolean(),
    nextCursor: z.string().nullable(),
    requestId: z.string().uuid().optional(),
  }),
});

export type TenantCustomerListResponseDto = z.infer<typeof TenantCustomerListResponseSchema>;

export const ExportCustomersRequestSchema = ExportRequestSchema.extend({
  sort: TenantCustomerListSortSchema.default('createdAt:desc'),
  status: TenantCustomerStatusSchema.optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  defaultBranchId: z.string().uuid().optional(),
});

export type ExportCustomersRequestDto = z.infer<typeof ExportCustomersRequestSchema>;

/** @deprecated Use `ListCustomersQuerySchema` — kept for Phase 0 API imports */
export const CustomerListQuerySchema = ListCustomersQuerySchema;

/** @deprecated Use `ListCustomersQueryDto` */
export type CustomerListQueryDto = ListCustomersQueryDto;
