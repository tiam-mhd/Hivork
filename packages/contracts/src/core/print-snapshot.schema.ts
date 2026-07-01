import { z } from 'zod';

import { FilterAstSchema } from '../ui/filter-ast.schema.js';
import { ExportLocaleSchema } from './export.schema.js';
import { TenantCustomerListSortSchema } from '../customers/customer-list.schema.js';
import { TenantCustomerStatusSchema } from '../customers/tenant-customer-base.schema.js';

export const PrintOrientationSchema = z.enum(['portrait', 'landscape']);

export type PrintOrientationDto = z.infer<typeof PrintOrientationSchema>;

export const PrintSnapshotResourceKeySchema = z.enum(['customers']);

export type PrintSnapshotResourceKeyDto = z.infer<typeof PrintSnapshotResourceKeySchema>;

export const TenantBrandingSchema = z.object({
  name: z.string(),
  legalName: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

export type TenantBrandingDto = z.infer<typeof TenantBrandingSchema>;

export const PrintTableColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
});

export type PrintTableColumnDto = z.infer<typeof PrintTableColumnSchema>;

export const PrintSnapshotPayloadSchema = z.object({
  resourceKey: PrintSnapshotResourceKeySchema,
  title: z.string(),
  locale: ExportLocaleSchema,
  orientation: PrintOrientationSchema,
  tenant: TenantBrandingSchema,
  generatedAt: z.string().datetime(),
  columns: z.array(PrintTableColumnSchema),
  rows: z.array(z.array(z.string())),
  rowCount: z.number().int().nonnegative(),
});

export type PrintSnapshotPayloadDto = z.infer<typeof PrintSnapshotPayloadSchema>;

export const CreateCustomerPrintSnapshotSchema = z.object({
  resourceKey: z.literal('customers'),
  search: z.string().trim().max(200).optional(),
  filter: FilterAstSchema.optional(),
  sort: TenantCustomerListSortSchema.default('createdAt:desc'),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  status: TenantCustomerStatusSchema.optional(),
  defaultBranchId: z.string().uuid().optional(),
  columns: z.array(z.string().trim().min(1)).optional(),
  ids: z.array(z.string().uuid()).optional(),
  locale: ExportLocaleSchema.default('fa-IR'),
  orientation: PrintOrientationSchema.default('portrait'),
});

export type CreateCustomerPrintSnapshotDto = z.infer<typeof CreateCustomerPrintSnapshotSchema>;

export const CreatePrintSnapshotSchema = CreateCustomerPrintSnapshotSchema;

export type CreatePrintSnapshotDto = z.infer<typeof CreatePrintSnapshotSchema>;

export const PrintSnapshotCreatedSchema = z.object({
  token: z.string().uuid(),
  expiresAt: z.string().datetime(),
});

export type PrintSnapshotCreatedDto = z.infer<typeof PrintSnapshotCreatedSchema>;

export const PrintSnapshotResponseSchema = PrintSnapshotPayloadSchema;

export type PrintSnapshotResponseDto = z.infer<typeof PrintSnapshotResponseSchema>;
