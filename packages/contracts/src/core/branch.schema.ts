import { z } from 'zod';

import { CursorPaginationSchema } from '../common/pagination.schema.js';
import { phoneSchema } from '../common/phone.schema.js';
import { coreListMetaSchema } from './shared.schema.js';

export const BranchListSortSchema = z.enum([
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
]);

export type BranchListSortDto = z.infer<typeof BranchListSortSchema>;

export const CreateBranchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(500).optional(),
  phone: phoneSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateBranchDto = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateBranchDto = z.infer<typeof UpdateBranchSchema>;

export const BranchResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BranchResponseDto = z.infer<typeof BranchResponseSchema>;

export const BranchListItemSchema = BranchResponseSchema.pick({
  id: true,
  name: true,
  address: true,
  phone: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
});

export type BranchListItemDto = z.infer<typeof BranchListItemSchema>;

export const BranchListQuerySchema = CursorPaginationSchema.pick({
  cursor: true,
  limit: true,
}).extend({
  sort: BranchListSortSchema.default('createdAt:desc'),
  isActive: z.coerce.boolean().optional(),
});

export type BranchListQueryDto = z.infer<typeof BranchListQuerySchema>;

export const BranchListResponseSchema = z.object({
  data: z.array(BranchListItemSchema),
  meta: coreListMetaSchema,
});

export type BranchListResponseDto = z.infer<typeof BranchListResponseSchema>;
