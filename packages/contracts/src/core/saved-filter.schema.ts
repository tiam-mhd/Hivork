import { z } from 'zod';

import { FilterAstSchema } from '../ui/filter-ast.schema.js';

export const SAVED_FILTER_RESOURCE_KEYS = ['customers', 'sales', 'installments'] as const;

export const SavedFilterResourceKeySchema = z.enum(SAVED_FILTER_RESOURCE_KEYS);

export type SavedFilterResourceKeyDto = z.infer<typeof SavedFilterResourceKeySchema>;

export const SavedFilterVisibilitySchema = z.enum(['private', 'shared']);

export type SavedFilterVisibilityDto = z.infer<typeof SavedFilterVisibilitySchema>;

export const ListSavedFiltersQuerySchema = z.object({
  resourceKey: SavedFilterResourceKeySchema,
});

export type ListSavedFiltersQueryDto = z.infer<typeof ListSavedFiltersQuerySchema>;

export const CreateSavedFilterSchema = z.object({
  resourceKey: SavedFilterResourceKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  filterAst: FilterAstSchema,
  isDefault: z.boolean().optional(),
});

export type CreateSavedFilterDto = z.infer<typeof CreateSavedFilterSchema>;

export const UpdateSavedFilterSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  filterAst: FilterAstSchema.optional(),
  isDefault: z.boolean().optional(),
  version: z.number().int().positive(),
});

export type UpdateSavedFilterDto = z.infer<typeof UpdateSavedFilterSchema>;

export const SoftDeleteSavedFilterBodySchema = z.object({
  deleteReason: z.string().trim().max(500).optional(),
});

export type SoftDeleteSavedFilterBodyDto = z.infer<typeof SoftDeleteSavedFilterBodySchema>;

export const SavedFilterItemSchema = z.object({
  id: z.string().uuid(),
  resourceKey: SavedFilterResourceKeySchema,
  name: z.string(),
  description: z.string().nullable(),
  filterAst: FilterAstSchema,
  isDefault: z.boolean(),
  visibility: SavedFilterVisibilitySchema,
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedFilterItemDto = z.infer<typeof SavedFilterItemSchema>;

export const SavedFilterListResponseSchema = z.object({
  items: z.array(SavedFilterItemSchema),
});

export type SavedFilterListResponseDto = z.infer<typeof SavedFilterListResponseSchema>;

export const SavedFilterResponseSchema = SavedFilterItemSchema;

export type SavedFilterResponseDto = z.infer<typeof SavedFilterResponseSchema>;
