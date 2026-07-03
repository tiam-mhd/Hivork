import { z } from 'zod';

import { bigintRialStringSchema } from '../common/money.schema.js';

export const ReconciliationDiscrepancyTypeSchema = z.enum([
  'missing_in_system',
  'missing_in_bank',
  'amount_mismatch',
]);

export type ReconciliationDiscrepancyTypeDto = z.infer<
  typeof ReconciliationDiscrepancyTypeSchema
>;

export const ReconciliationDiscrepancyStatusSchema = z.enum(['open', 'resolved', 'ignored']);

export type ReconciliationDiscrepancyStatusDto = z.infer<
  typeof ReconciliationDiscrepancyStatusSchema
>;

export const ReconciliationReportSummarySchema = z.object({
  id: z.string().uuid(),
  settlementBatchId: z.string().uuid(),
  matchedCount: z.number().int().nonnegative(),
  discrepancyCount: z.number().int().nonnegative(),
  bankTotalRial: bigintRialStringSchema,
  systemTotalRial: bigintRialStringSchema,
});

export type ReconciliationReportSummaryDto = z.infer<
  typeof ReconciliationReportSummarySchema
>;

export const ReconciliationDiscrepancySummarySchema = z.object({
  id: z.string().uuid(),
  discrepancyType: ReconciliationDiscrepancyTypeSchema,
  status: ReconciliationDiscrepancyStatusSchema,
  bankReference: z.string().nullable().optional(),
  bankAmountRial: bigintRialStringSchema.nullable().optional(),
  ledgerEntryId: z.string().uuid().nullable().optional(),
  systemAmountRial: bigintRialStringSchema.nullable().optional(),
  resolveNote: z.string().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  version: z.number().int().min(1),
});

export type ReconciliationDiscrepancySummaryDto = z.infer<
  typeof ReconciliationDiscrepancySummarySchema
>;

export const RunReconciliationResponseSchema = z.object({
  report: ReconciliationReportSummarySchema,
  discrepancies: z.array(ReconciliationDiscrepancySummarySchema),
});

export type RunReconciliationResponseDto = z.infer<typeof RunReconciliationResponseSchema>;

export const GetReconciliationReportResponseSchema = z.object({
  report: ReconciliationReportSummarySchema,
  discrepancies: z.array(ReconciliationDiscrepancySummarySchema),
});

export type GetReconciliationReportResponseDto = z.infer<
  typeof GetReconciliationReportResponseSchema
>;

export const ReconcileSettlementFormSchema = z.object({
  encoding: z.enum(['utf-8', 'utf8']).default('utf-8'),
});

export type ReconcileSettlementFormDto = z.infer<typeof ReconcileSettlementFormSchema>;

export const ResolveDiscrepancyBodySchema = z.object({
  resolveNote: z.string().trim().min(1).max(500),
  expectedVersion: z.number().int().min(1),
});

export type ResolveDiscrepancyBodyDto = z.infer<typeof ResolveDiscrepancyBodySchema>;

export const ResolveDiscrepancyResponseSchema = z.object({
  discrepancy: ReconciliationDiscrepancySummarySchema,
});

export type ResolveDiscrepancyResponseDto = z.infer<
  typeof ResolveDiscrepancyResponseSchema
>;
