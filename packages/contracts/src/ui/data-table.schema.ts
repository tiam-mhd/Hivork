import { z } from 'zod';

export const DataTableSortDirSchema = z.enum(['asc', 'desc']);

export type DataTableSortDir = z.infer<typeof DataTableSortDirSchema>;

/** Shared query params for cursor-paginated admin lists (ADR-016). */
export const DataTableQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().min(1).optional(),
  sortDir: DataTableSortDirSchema.optional(),
});

export type DataTableQuery = z.infer<typeof DataTableQuerySchema>;

export const DATA_TABLE_MAX_LIMIT = 100;

/** Prefix for per-staff column personalization keys in localStorage. */
export { COLUMN_PERSONALIZATION_STORAGE_PREFIX } from './column-personalization.schema.js';

export function clampDataTableLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 20;
  }
  return Math.min(Math.max(1, Math.floor(limit)), DATA_TABLE_MAX_LIMIT);
}
