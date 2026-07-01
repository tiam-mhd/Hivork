import { z } from 'zod';

/** Cursor-paginated list response envelope (items + meta). */
export function createPaginatedListResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().int().nonnegative().optional(),
  });
}

export type PaginatedListResponse<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount?: number;
};
