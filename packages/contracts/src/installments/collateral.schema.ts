import { z } from 'zod';

import {
  bigintRialPositiveTransformSchema,
  dateOnlySchema,
} from '../common/money.schema.js';

export const CollateralTypeSchema = z.enum([
  'cheque',
  'promissory_note',
  'gold',
  'vehicle',
  'property',
  'cash_deposit',
  'other',
]);

export type CollateralTypeDto = z.infer<typeof CollateralTypeSchema>;

export const CollateralStatusSchema = z.enum(['pledged', 'released', 'forfeited']);

export type CollateralStatusDto = z.infer<typeof CollateralStatusSchema>;

export const CollateralSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  collateralType: CollateralTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  estimatedValueRial: z.string(),
  documentFileId: z.string().uuid().nullable(),
  registrationNumber: z.string().nullable(),
  issuedAt: dateOnlySchema.nullable(),
  status: CollateralStatusSchema,
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdById: z.string().uuid().nullable(),
  version: z.number().int().positive(),
});

export type CollateralDto = z.infer<typeof CollateralSchema>;

export const CreateCollateralSchema = z.object({
  collateralType: CollateralTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  estimatedValueRial: bigintRialPositiveTransformSchema,
  documentFileId: z.string().uuid().optional(),
  registrationNumber: z.string().trim().max(100).optional(),
  issuedAt: dateOnlySchema.optional(),
  sortOrder: z.number().int().nonnegative().max(9999).optional(),
});

export type CreateCollateralDto = z.infer<typeof CreateCollateralSchema>;

export const UpdateCollateralSchema = z
  .object({
    collateralType: CollateralTypeSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.union([z.string().trim().max(2000), z.null()]).optional(),
    estimatedValueRial: bigintRialPositiveTransformSchema.optional(),
    documentFileId: z.union([z.string().uuid(), z.null()]).optional(),
    registrationNumber: z.union([z.string().trim().max(100), z.null()]).optional(),
    issuedAt: z.union([dateOnlySchema, z.null()]).optional(),
    sortOrder: z.number().int().nonnegative().max(9999).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'VALIDATION_ERROR',
  });

export type UpdateCollateralDto = z.infer<typeof UpdateCollateralSchema>;

export const ReleaseCollateralSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export type ReleaseCollateralDto = z.infer<typeof ReleaseCollateralSchema>;

export const ForfeitCollateralSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export type ForfeitCollateralDto = z.infer<typeof ForfeitCollateralSchema>;

export const CollateralListResponseSchema = z.object({
  data: z.array(CollateralSchema),
});

export type CollateralListResponseDto = z.infer<typeof CollateralListResponseSchema>;

export const DeleteCollateralBodySchema = z.object({
  deleteReason: z.string().trim().min(3).max(500).optional(),
});

export type DeleteCollateralBodyDto = z.infer<typeof DeleteCollateralBodySchema>;
