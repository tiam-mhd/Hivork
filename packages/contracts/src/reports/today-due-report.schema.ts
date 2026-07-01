import { z } from 'zod';

import { InstallmentSummarySchema } from '../installments/installment.schema.js';

export const TodayDueReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TodayDueReportQueryDto = z.infer<typeof TodayDueReportQuerySchema>;

export const TodayDueReportMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  totalAmountRial: z.string(),
  hasNext: z.boolean(),
  nextCursor: z.string().nullable(),
});

export type TodayDueReportMetaDto = z.infer<typeof TodayDueReportMetaSchema>;

export const TodayDueReportResponseSchema = z.object({
  data: z.array(InstallmentSummarySchema),
  meta: TodayDueReportMetaSchema,
});

export type TodayDueReportResponseDto = z.infer<typeof TodayDueReportResponseSchema>;
