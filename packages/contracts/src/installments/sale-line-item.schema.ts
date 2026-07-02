import { z } from 'zod';

import {
  bigintRialNonNegativeSchema,
  bigintRialStringSchema,
  dateOnlySchema,
} from '../common/money.schema.js';

export const SaleLineItemSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  title: z.string().min(1).max(200),
  sku: z.string().max(64).nullable(),
  quantity: z.number().int().min(1).max(9999),
  unitPriceRial: bigintRialStringSchema,
  discountRial: bigintRialNonNegativeSchema,
  taxRial: bigintRialNonNegativeSchema,
  lineTotalRial: bigintRialNonNegativeSchema,
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdById: z.string().uuid().nullable(),
  version: z.number().int().positive(),
});

export type SaleLineItemDto = z.infer<typeof SaleLineItemSchema>;

export const CreateSaleLineItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(64).optional(),
  quantity: z.number().int().min(1).max(9999).default(1),
  unitPriceRial: bigintRialStringSchema,
  discountRial: bigintRialNonNegativeSchema.default('0'),
  taxRial: bigintRialNonNegativeSchema.default('0'),
  sortOrder: z.number().int().nonnegative().max(9999).optional(),
});

export type CreateSaleLineItemDto = z.infer<typeof CreateSaleLineItemSchema>;

export const UpdateSaleLineItemSchema = CreateSaleLineItemSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'VALIDATION_ERROR' },
);

export type UpdateSaleLineItemDto = z.infer<typeof UpdateSaleLineItemSchema>;

export const BulkUpsertLineItemsSchema = z.object({
  items: z.array(CreateSaleLineItemSchema).min(1).max(100),
  expectedVersion: z.number().int().positive(),
  regenerateInstallments: z.boolean().default(false),
});

export type BulkUpsertLineItemsDto = z.infer<typeof BulkUpsertLineItemsSchema>;

export const UpdateSaleFinancialsSchema = z.object({
  expectedVersion: z.number().int().positive(),
  taxRial: bigintRialNonNegativeSchema.nullable().optional(),
  taxRateBps: z.number().int().min(0).max(10000).nullable().optional(),
  taxInclusive: z.boolean().optional(),
  insuranceRial: bigintRialNonNegativeSchema.nullable().optional(),
  insuranceProvider: z.string().trim().max(200).nullable().optional(),
  insurancePolicyNumber: z.string().trim().max(100).nullable().optional(),
  insuranceExpiresAt: dateOnlySchema.nullable().optional(),
});

export type UpdateSaleFinancialsDto = z.infer<typeof UpdateSaleFinancialsSchema>;

export const RecalculateSaleFinancialsSchema = z.object({
  expectedVersion: z.number().int().positive(),
  regenerateInstallments: z.boolean().default(false),
  changeReason: z.string().trim().min(3).max(500).optional(),
});

export type RecalculateSaleFinancialsDto = z.infer<typeof RecalculateSaleFinancialsSchema>;

export const RecalculateSaleFinancialsResponseSchema = z.object({
  totalAmountRial: bigintRialStringSchema,
  subtotalRial: bigintRialNonNegativeSchema,
  taxRial: bigintRialNonNegativeSchema,
  insuranceRial: bigintRialNonNegativeSchema,
  requiresScheduleRegeneration: z.boolean(),
  version: z.number().int().positive(),
});

export type RecalculateSaleFinancialsResponseDto = z.infer<
  typeof RecalculateSaleFinancialsResponseSchema
>;

export const SaleLineItemListResponseSchema = z.object({
  data: z.array(SaleLineItemSchema),
});

export const DeleteSaleLineItemBodySchema = z.object({
  deleteReason: z.string().trim().min(3).max(500),
});

export type DeleteSaleLineItemBodyDto = z.infer<typeof DeleteSaleLineItemBodySchema>;
