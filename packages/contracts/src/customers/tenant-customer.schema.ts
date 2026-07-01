import { z } from 'zod';

import { bigintRialNonNegativeSchema, dateOnlySchema } from '../common/money.schema.js';
import { phoneSchema } from '../common/phone.schema.js';
import {
  GlobalCustomerEmbedSchema,
  PreferredContactChannelSchema,
  TenantCustomerGenderSchema,
  TenantCustomerStatusSchema,
} from './tenant-customer-base.schema.js';

export {
  GlobalCustomerEmbedSchema,
  PreferredContactChannelSchema,
  TenantCustomerGenderSchema,
  TenantCustomerStatusSchema,
  type GlobalCustomerEmbedDto,
  type PreferredContactChannelDto,
  type TenantCustomerGenderDto,
  type TenantCustomerStatusDto,
} from './tenant-customer-base.schema.js';

export const CreateTenantCustomerSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().optional(),
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{10}$/)
    .optional(),
  birthDate: dateOnlySchema.optional(),
  gender: TenantCustomerGenderSchema.optional(),
  address: z.string().trim().max(500).optional(),
  localCode: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(30)).max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
  defaultBranchId: z.string().uuid().optional(),
  preferredContactChannel: PreferredContactChannelSchema.optional(),
  marketingOptIn: z.boolean().optional(),
});

export type CreateTenantCustomerDto = z.infer<typeof CreateTenantCustomerSchema>;

export { UpdateTenantCustomerSchema, type UpdateTenantCustomerDto } from './update-tenant-customer.schema.js';

export {
  ImportCustomerErrorSchema,
  ImportCustomerRowErrorCodeSchema,
  ImportCustomersResultSchema,
  type ImportCustomerErrorDto,
  type ImportCustomerRowErrorCodeDto,
  type ImportCustomersResultDto,
} from './import-customers.schema.js';

export {
  ListCustomersQuerySchema,
  CustomerListQuerySchema,
  ExportCustomersRequestSchema,
  TenantCustomerListSortSchema,
  TenantCustomerListItemSchema,
  TenantCustomerListResponseSchema,
  type ListCustomersQueryDto,
  type CustomerListQueryDto,
  type ExportCustomersRequestDto,
  type TenantCustomerListSortDto,
  type TenantCustomerListItemDto,
  type TenantCustomerListResponseDto,
} from './customer-list.schema.js';

export const TenantCustomerSummarySchema = z.object({
  id: z.string().uuid(),
  globalCustomer: GlobalCustomerEmbedSchema,
  localCode: z.string().nullable().optional(),
  tags: z.array(z.string()),
  creditScore: z.number().int().min(0).max(100).nullable().optional(),
  overdueCount: z.number().int().nonnegative().optional(),
  totalPurchaseRial: bigintRialNonNegativeSchema.optional(),
  lastPurchaseAt: z.string().datetime().nullable().optional(),
  preferredContactChannel: PreferredContactChannelSchema.nullable().optional(),
  defaultBranchId: z.string().uuid().nullable().optional(),
  status: TenantCustomerStatusSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  version: z.number().int().positive().optional(),
});

export type TenantCustomerSummaryDto = z.infer<typeof TenantCustomerSummarySchema>;

export const SalesSummaryEmbedSchema = z.object({
  activeSaleCount: z.number().int().nonnegative(),
  totalOutstandingRial: bigintRialNonNegativeSchema,
  lastSaleAt: z.string().datetime().nullable(),
});

export type SalesSummaryEmbedDto = z.infer<typeof SalesSummaryEmbedSchema>;

export const TenantCustomerDetailSchema = TenantCustomerSummarySchema.extend({
  email: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  gender: TenantCustomerGenderSchema.nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  marketingOptIn: z.boolean().optional(),
  salesSummary: SalesSummaryEmbedSchema.optional(),
});

export type TenantCustomerDetailDto = z.infer<typeof TenantCustomerDetailSchema>;

/** @deprecated Phase 0 list item — use `TenantCustomerListItemSchema` from customer-list.schema */
export const LegacyCustomerListItemSchema = z.object({
  id: z.string().uuid(),
  localCode: z.string().nullable(),
  defaultBranchId: z.string().uuid().nullable(),
  creditScore: z.number().int(),
  overdueCount: z.number().int(),
  createdAt: z.string().datetime(),
  customer: GlobalCustomerEmbedSchema,
});

export type LegacyCustomerListItemDto = z.infer<typeof LegacyCustomerListItemSchema>;

/** @deprecated Phase 0 list response — use `TenantCustomerListResponseSchema` */
export const CustomerListResponseSchema = z.object({
  items: z.array(LegacyCustomerListItemSchema),
  nextCursor: z.string().nullable(),
});

export type CustomerListResponseDto = z.infer<typeof CustomerListResponseSchema>;

/** Full create/get response — Phase 0 shape with nested `customer` */
export const TenantCustomerResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  globalCustomerId: z.string().uuid(),
  localCode: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  defaultBranchId: z.string().uuid().nullable(),
  preferredContactChannel: PreferredContactChannelSchema.nullable(),
  marketingOptIn: z.boolean().nullable(),
  creditScore: z.number().int().min(0).max(100),
  overdueCount: z.number().int().nonnegative(),
  totalPurchaseRial: bigintRialNonNegativeSchema,
  lastPurchaseAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  version: z.number().int().positive().optional(),
  customer: GlobalCustomerEmbedSchema.extend({
    email: z.string().nullable().optional(),
    nationalId: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
    gender: TenantCustomerGenderSchema.nullable().optional(),
    address: z.string().nullable().optional(),
    preferredContactChannel: PreferredContactChannelSchema.nullable().optional(),
    marketingOptIn: z.boolean().optional(),
    status: TenantCustomerStatusSchema.optional(),
  }),
});

export type TenantCustomerResponseDto = z.infer<typeof TenantCustomerResponseSchema>;

export {
  GetTenantCustomerQuerySchema,
  TenantCustomerDetailResponseSchema,
  TenantCustomerGlobalProfileSchema,
  TenantCustomerSalesSummarySchema,
  type GetTenantCustomerQueryDto,
  type TenantCustomerDetailResponseDto,
  type TenantCustomerGlobalProfileDto,
  type TenantCustomerSalesSummaryDto,
} from './tenant-customer-detail.schema.js';
