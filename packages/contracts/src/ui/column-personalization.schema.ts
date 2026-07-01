import { z } from 'zod';

export const ColumnPersonalizationSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
  visibility: z.record(z.string(), z.boolean()),
  widths: z
    .record(z.string(), z.number().int().min(50).max(600))
    .optional(),
});

export type ColumnPersonalization = z.infer<typeof ColumnPersonalizationSchema>;

export const COLUMN_PERSONALIZATION_STORAGE_PREFIX = 'hivork:columns:';

export function buildColumnStorageKey(resourceKey: string, staffId: string): string {
  return `${COLUMN_PERSONALIZATION_STORAGE_PREFIX}${resourceKey}:${staffId}`;
}
