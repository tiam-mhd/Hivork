import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
