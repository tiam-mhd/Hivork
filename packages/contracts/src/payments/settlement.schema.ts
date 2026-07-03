import { z } from 'zod';

import { bigintRialStringSchema } from '../common/money.schema.js';

const jalaliDateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, 'Invalid Jalali date format');

export const SettlementBatchStatusSchema = z.enum(['open', 'closed']);

export type SettlementBatchStatusDto = z.infer<typeof SettlementBatchStatusSchema>;

export const SettlementBatchSummarySchema = z.object({
  id: z.string().uuid(),
  batchNumber: z.string(),
  status: SettlementBatchStatusSchema,
  branchId: z.string().uuid(),
  periodFrom: z.string(),
  periodTo: z.string(),
  totalAmountRial: bigintRialStringSchema,
  entryCount: z.number().int().nonnegative(),
  note: z.string().nullable().optional(),
  closedAt: z.string().datetime().nullable().optional(),
  version: z.number().int().min(1),
});

export type SettlementBatchSummaryDto = z.infer<typeof SettlementBatchSummarySchema>;

export const CreateSettlementBatchBodySchema = z.object({
  branchId: z.string().uuid(),
  periodFrom: jalaliDateInputSchema,
  periodTo: jalaliDateInputSchema,
  paymentMethods: z
    .array(z.enum(['card', 'online']))
    .min(1),
  note: z.string().trim().max(500).optional(),
});

export type CreateSettlementBatchBodyDto = z.infer<typeof CreateSettlementBatchBodySchema>;

export const CreateSettlementBatchResponseSchema = z.object({
  settlement: SettlementBatchSummarySchema.pick({
    id: true,
    batchNumber: true,
    status: true,
    totalAmountRial: true,
    entryCount: true,
  }),
});

export type CreateSettlementBatchResponseDto = z.infer<
  typeof CreateSettlementBatchResponseSchema
>;

export const ListSettlementBatchesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: SettlementBatchStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSettlementBatchesQueryDto = z.infer<
  typeof ListSettlementBatchesQuerySchema
>;

export const ListSettlementBatchesResponseSchema = z.object({
  items: z.array(SettlementBatchSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ListSettlementBatchesResponseDto = z.infer<
  typeof ListSettlementBatchesResponseSchema
>;

export const SettlementBatchEntryDetailSchema = z.object({
  id: z.string().uuid(),
  ledgerEntryId: z.string().uuid(),
  amountRial: bigintRialStringSchema,
  paymentMethod: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

export type SettlementBatchEntryDetailDto = z.infer<
  typeof SettlementBatchEntryDetailSchema
>;

export const GetSettlementBatchResponseSchema = z.object({
  settlement: SettlementBatchSummarySchema,
  entries: z.array(SettlementBatchEntryDetailSchema),
});

export type GetSettlementBatchResponseDto = z.infer<
  typeof GetSettlementBatchResponseSchema
>;

export const CloseSettlementBatchBodySchema = z.object({
  expectedVersion: z.number().int().min(1),
});

export type CloseSettlementBatchBodyDto = z.infer<typeof CloseSettlementBatchBodySchema>;

export const CloseSettlementBatchResponseSchema = z.object({
  settlement: SettlementBatchSummarySchema,
});

export type CloseSettlementBatchResponseDto = z.infer<
  typeof CloseSettlementBatchResponseSchema
>;
