import { z } from 'zod';

/** API wire format — lowercase snake_case change types (maps from Prisma CREATE, FINANCIAL_RECALC, …). */
export const ContractVersionChangeTypeSchema = z.enum([
  'create',
  'update',
  'extend',
  'copy_source',
  'terminate',
  'close',
  'financial_recalc',
]);

export type ContractVersionChangeTypeDto = z.infer<typeof ContractVersionChangeTypeSchema>;

export const ContractVersionSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  changeType: ContractVersionChangeTypeSchema,
  changeReason: z.string(),
  createdAt: z.string().datetime(),
  createdById: z.string().uuid().nullable(),
});

export type ContractVersionDto = z.infer<typeof ContractVersionSchema>;

/** Embedded on sale detail — omits redundant saleId. */
export const ContractVersionSummarySchema = ContractVersionSchema.omit({ saleId: true });

export type ContractVersionSummaryDto = z.infer<typeof ContractVersionSummarySchema>;

export const ListContractVersionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListContractVersionsQueryDto = z.infer<typeof ListContractVersionsQuerySchema>;

export const ContractVersionListResponseSchema = z.object({
  data: z.array(ContractVersionSchema),
  meta: z
    .object({
      nextCursor: z.string().nullable().optional(),
      hasMore: z.boolean().optional(),
    })
    .optional(),
});

export type ContractVersionListResponseDto = z.infer<typeof ContractVersionListResponseSchema>;
