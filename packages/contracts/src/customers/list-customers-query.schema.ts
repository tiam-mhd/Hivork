import { z } from 'zod';

import { ExportFormatSchema, ExportLocaleSchema, ExportRequestSchema } from '../core/export.schema.js';
import { parseFilterQueryParam } from '../core/list-query.schema.js';
import type { FilterAst } from '../ui/filter-ast.schema.js';
import { customerValidationMessages } from './customer-validation-messages.js';
import {
  PreferredContactChannelSchema,
  TenantCustomerLinkStatusSchema,
  TenantCustomerStatusSchema,
} from './tenant-customer-base.schema.js';

/** IFP-040 — filter by tenant-customer link lifecycle (admin may include deleted via recycle API) */
export const TenantCustomerListLinkStatusFilterSchema = z.enum([
  'active',
  'archived',
  'blacklisted',
  'deleted',
]);

export type TenantCustomerListLinkStatusFilterDto = z.infer<
  typeof TenantCustomerListLinkStatusFilterSchema
>;

export const TenantCustomerListSortSchema = z.enum([
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'lastPurchaseAt:desc',
  'lastPurchaseAt:asc',
  'overdueCount:desc',
  'overdueCount:asc',
  'creditScore:desc',
  'creditScore:asc',
  'totalPurchaseRial:desc',
  'totalPurchaseRial:asc',
]);

export type TenantCustomerListSortDto = z.infer<typeof TenantCustomerListSortSchema>;

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value;
}, z.boolean().optional());

const isoDateTimeQuerySchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .optional();

const ListCustomersQueryObjectSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100, customerValidationMessages.limitInvalid).default(20),
  sort: TenantCustomerListSortSchema.default('createdAt:desc'),
  /** Live search — alias `search` for backward compatibility */
  q: z.string().trim().max(200).optional(),
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
          message: customerValidationMessages.filterInvalid,
        });
        return z.NEVER;
      }

      return ast;
    }),
  /** Global customer account status (active / suspended) */
  status: TenantCustomerStatusSchema.optional(),
  /** Tenant-customer link status — IFP-040 filter prep */
  linkStatus: TenantCustomerListLinkStatusFilterSchema.optional(),
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
  categoryId: z.string().uuid(customerValidationMessages.uuid).optional(),
  isBlacklisted: booleanQuerySchema,
  /** Alias for defaultBranchId — IFP-040 */
  branchId: z.string().uuid(customerValidationMessages.uuid).optional(),
  defaultBranchId: z.string().uuid(customerValidationMessages.uuid).optional(),
  assignedStaffId: z.string().uuid(customerValidationMessages.uuid).optional(),
  createdAtFrom: isoDateTimeQuerySchema,
  createdAtTo: isoDateTimeQuerySchema,
  lastPurchaseAtFrom: isoDateTimeQuerySchema,
  lastPurchaseAtTo: isoDateTimeQuerySchema,
  includeArchived: booleanQuerySchema,
  totalEstimate: booleanQuerySchema,
});

function transformListCustomersQuery<T extends z.infer<typeof ListCustomersQueryObjectSchema>>(
  query: T,
) {
  return {
    ...query,
    search: query.q ?? query.search,
    branchId: query.branchId ?? query.defaultBranchId,
    defaultBranchId: query.branchId ?? query.defaultBranchId,
    includeCount: query.totalEstimate === true,
  };
}

export const ListCustomersQuerySchema =
  ListCustomersQueryObjectSchema.transform(transformListCustomersQuery);

export type ListCustomersQueryDto = z.infer<typeof ListCustomersQuerySchema>;

export const TenantCustomerListItemSchema = z.object({
  id: z.string().uuid(),
  globalCustomer: z.object({
    id: z.string().uuid(),
    phone: z.string(),
    phoneMasked: z.string(),
    name: z.string().nullable(),
  }),
  localCode: z.string().nullable(),
  tags: z.array(z.string()),
  creditScore: z.number().int().min(0).max(100),
  overdueCount: z.number().int().nonnegative(),
  totalPurchaseRial: z.string(),
  lastPurchaseAt: z.string().datetime().nullable(),
  preferredContactChannel: PreferredContactChannelSchema.nullable(),
  linkStatus: TenantCustomerLinkStatusSchema.optional(),
  isBlacklisted: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  primaryAddressCity: z.string().nullable().optional(),
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
  linkStatus: TenantCustomerListLinkStatusFilterSchema.optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  branchId: z.string().uuid(customerValidationMessages.uuid).optional(),
  defaultBranchId: z.string().uuid(customerValidationMessages.uuid).optional(),
  categoryId: z.string().uuid(customerValidationMessages.uuid).optional(),
  isBlacklisted: z.boolean().optional(),
  assignedStaffId: z.string().uuid(customerValidationMessages.uuid).optional(),
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
  lastPurchaseAtFrom: z.string().datetime().optional(),
  lastPurchaseAtTo: z.string().datetime().optional(),
  includeArchived: z.boolean().optional(),
}).transform((body) => ({
  ...body,
  branchId: body.branchId ?? body.defaultBranchId,
  defaultBranchId: body.branchId ?? body.defaultBranchId,
}));

export const ExportCustomersQuerySchema = ListCustomersQueryObjectSchema.extend({
  format: ExportFormatSchema.default('xlsx'),
  locale: ExportLocaleSchema.default('fa-IR'),
  columns: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? [
            ...new Set(
              value
                .split(',')
                .map((column) => column.trim())
                .filter(Boolean),
            ),
          ]
        : undefined,
    ),
  ids: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? [
            ...new Set(
              value
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean),
            ),
          ]
        : undefined,
    ),
}).transform(transformListCustomersQuery);

export type ExportCustomersQueryDto = z.infer<typeof ExportCustomersQuerySchema>;

export type ExportCustomersRequestDto = z.infer<typeof ExportCustomersRequestSchema>;

/** @deprecated Use `ListCustomersQuerySchema` — kept for Phase 0 API imports */
export const CustomerListQuerySchema = ListCustomersQuerySchema;

/** @deprecated Use `ListCustomersQueryDto` */
export type CustomerListQueryDto = ListCustomersQueryDto;
