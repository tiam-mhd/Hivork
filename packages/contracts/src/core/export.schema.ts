import { z } from 'zod';

import { FilterAstSchema } from '../ui/filter-ast.schema.js';

export const ExportFormatSchema = z.enum(['xlsx', 'pdf']);

export type ExportFormatDto = z.infer<typeof ExportFormatSchema>;

export const ExportLocaleSchema = z.enum(['fa-IR', 'en']);

export type ExportLocaleDto = z.infer<typeof ExportLocaleSchema>;

/** Base export body — mirrors list query (IFP-TASK-023) without cursor pagination. */
export const ExportRequestSchema = z.object({
  search: z.string().trim().max(200).optional(),
  filter: FilterAstSchema.optional(),
  format: ExportFormatSchema.default('xlsx'),
  columns: z.array(z.string().trim().min(1)).optional(),
  ids: z.array(z.string().uuid()).optional(),
  locale: ExportLocaleSchema.default('fa-IR'),
});

export type ExportRequestDto = z.infer<typeof ExportRequestSchema>;
