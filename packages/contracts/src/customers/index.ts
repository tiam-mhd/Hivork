import { z } from 'zod';

import { PaginationQuerySchema } from '../common/pagination.schema.js';

export {
  CreateTenantCustomerSchema,
  CustomerListQuerySchema,
  CustomerListResponseSchema,
  GlobalCustomerEmbedSchema,
  ImportCustomerErrorSchema,
  ImportCustomersResultSchema,
  ImportCustomerRowErrorCodeSchema,
  ListCustomersQuerySchema,
  ExportCustomersRequestSchema,
  PreferredContactChannelSchema,
  SalesSummaryEmbedSchema,
  TenantCustomerDetailSchema,
  GetTenantCustomerQuerySchema,
  TenantCustomerDetailResponseSchema,
  TenantCustomerGlobalProfileSchema,
  TenantCustomerSalesSummarySchema,
  TenantCustomerGenderSchema,
  TenantCustomerListItemSchema,
  TenantCustomerListResponseSchema,
  TenantCustomerListSortSchema,
  type TenantCustomerListItemDto,
  type TenantCustomerListResponseDto,
  type TenantCustomerListSortDto,
  TenantCustomerResponseSchema,
  TenantCustomerStatusSchema,
  TenantCustomerSummarySchema,
  UpdateTenantCustomerSchema,
  type CreateTenantCustomerDto,
  type CustomerListQueryDto,
  type CustomerListResponseDto,
  type GlobalCustomerEmbedDto,
  type ImportCustomerErrorDto,
  type ImportCustomersResultDto,
  type ImportCustomerRowErrorCodeDto,
  type ListCustomersQueryDto,
  type ExportCustomersRequestDto,
  type PreferredContactChannelDto,
  type SalesSummaryEmbedDto,
  type TenantCustomerDetailDto,
  type GetTenantCustomerQueryDto,
  type TenantCustomerDetailResponseDto,
  type TenantCustomerGlobalProfileDto,
  type TenantCustomerSalesSummaryDto,
  type TenantCustomerGenderDto,
  type TenantCustomerResponseDto,
  type TenantCustomerStatusDto,
  type TenantCustomerSummaryDto,
  type UpdateTenantCustomerDto,
} from './tenant-customer.schema.js';

export const SoftDeleteCustomerBodySchema = z.object({
  deleteReason: z.string().trim().max(500).optional(),
});

export type SoftDeleteCustomerBodyDto = z.infer<typeof SoftDeleteCustomerBodySchema>;

export const ListDeletedCustomersQuerySchema = PaginationQuerySchema.pick({ limit: true }).extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListDeletedCustomersQueryDto = z.infer<typeof ListDeletedCustomersQuerySchema>;
