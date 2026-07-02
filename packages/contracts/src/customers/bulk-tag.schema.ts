import { z } from 'zod';

export const BulkTagCustomersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  tag: z.string().trim().min(1).max(30),
});

export type BulkTagCustomersDto = z.infer<typeof BulkTagCustomersSchema>;

export const BulkUntagCustomersSchema = BulkTagCustomersSchema.extend({
  isUndo: z.boolean().optional(),
  originalAction: z.string().trim().max(120).optional(),
});

export type BulkUntagCustomersDto = z.infer<typeof BulkUntagCustomersSchema>;

export const BulkTagCustomersResponseSchema = z.object({
  updatedCount: z.number().int().nonnegative(),
  tag: z.string(),
});

export type BulkTagCustomersResponseDto = z.infer<typeof BulkTagCustomersResponseSchema>;
