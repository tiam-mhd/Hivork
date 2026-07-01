import { z } from 'zod';

export const BulkActionVariantSchema = z.enum(['default', 'destructive', 'outline']);
export type BulkActionVariant = z.infer<typeof BulkActionVariantSchema>;

/** Row id → selected. Client-only — not synced to URL. */
export type RowSelectionState = Record<string, boolean>;

export const BulkActionMetaSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  variant: BulkActionVariantSchema.optional(),
  permission: z.string().optional(),
  requiresConfirm: z.boolean().optional(),
  confirmTitle: z.string().optional(),
  confirmDescription: z.string().optional(),
});

export type BulkActionMeta = z.infer<typeof BulkActionMetaSchema>;
