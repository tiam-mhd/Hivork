import { z } from 'zod';

import { ColumnPersonalizationSchema } from '../ui/column-personalization.schema.js';
import { DataTableSortDirSchema } from '../ui/data-table.schema.js';
import { FilterAstSchema } from '../ui/filter-ast.schema.js';
import { SAVED_FILTER_RESOURCE_KEYS } from './saved-filter.schema.js';

export const SAVED_VIEW_RESOURCE_KEYS = SAVED_FILTER_RESOURCE_KEYS;

export const SavedViewResourceKeySchema = z.enum(SAVED_VIEW_RESOURCE_KEYS);

export type SavedViewResourceKeyDto = z.infer<typeof SavedViewResourceKeySchema>;

export const SavedViewVisibilitySchema = z.enum(['private', 'shared']);

export type SavedViewVisibilityDto = z.infer<typeof SavedViewVisibilitySchema>;

export const SavedViewStateSchema = z.object({
  columnState: ColumnPersonalizationSchema,
  sortBy: z.string().trim().min(1).max(64).optional(),
  sortDir: DataTableSortDirSchema.optional(),
  search: z.string().trim().max(200).optional(),
  savedFilterId: z.string().uuid().optional(),
});

export type SavedViewStateDto = z.infer<typeof SavedViewStateSchema>;

export const ListSavedViewsQuerySchema = z.object({
  resourceKey: SavedViewResourceKeySchema,
  includeShared: z.coerce.boolean().optional().default(false),
});

export type ListSavedViewsQueryDto = z.infer<typeof ListSavedViewsQuerySchema>;

export const CreateSavedViewSchema = z.object({
  resourceKey: SavedViewResourceKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  columnState: ColumnPersonalizationSchema,
  sortBy: z.string().trim().min(1).max(64).optional(),
  sortDir: DataTableSortDirSchema.optional(),
  search: z.string().trim().max(200).optional(),
  savedFilterId: z.string().uuid().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateSavedViewDto = z.infer<typeof CreateSavedViewSchema>;

export const UpdateSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  columnState: ColumnPersonalizationSchema.optional(),
  sortBy: z.string().trim().min(1).max(64).nullable().optional(),
  sortDir: DataTableSortDirSchema.nullable().optional(),
  search: z.string().trim().max(200).nullable().optional(),
  savedFilterId: z.string().uuid().nullable().optional(),
  isDefault: z.boolean().optional(),
  visibility: SavedViewVisibilitySchema.optional(),
  version: z.number().int().positive(),
});

export type UpdateSavedViewDto = z.infer<typeof UpdateSavedViewSchema>;

export const SoftDeleteSavedViewBodySchema = z.object({
  deleteReason: z.string().trim().max(500).optional(),
});

export type SoftDeleteSavedViewBodyDto = z.infer<typeof SoftDeleteSavedViewBodySchema>;

export const ForkSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type ForkSavedViewDto = z.infer<typeof ForkSavedViewSchema>;

export const SavedViewItemSchema = z.object({
  id: z.string().uuid(),
  resourceKey: SavedViewResourceKeySchema,
  name: z.string(),
  description: z.string().nullable(),
  columnState: ColumnPersonalizationSchema,
  sortBy: z.string().nullable(),
  sortDir: DataTableSortDirSchema.nullable(),
  search: z.string().nullable(),
  savedFilterId: z.string().uuid().nullable(),
  filterAst: FilterAstSchema.nullable(),
  isDefault: z.boolean(),
  visibility: SavedViewVisibilitySchema,
  ownerName: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedViewItemDto = z.infer<typeof SavedViewItemSchema>;

export const SavedViewListResponseSchema = z.object({
  mine: z.array(SavedViewItemSchema),
  shared: z.array(SavedViewItemSchema),
});

export type SavedViewListResponseDto = z.infer<typeof SavedViewListResponseSchema>;

export const SavedViewResponseSchema = SavedViewItemSchema;

export type SavedViewResponseDto = z.infer<typeof SavedViewResponseSchema>;
