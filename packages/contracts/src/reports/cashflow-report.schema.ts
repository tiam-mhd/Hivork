import { z } from 'zod';

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM');

export const CashflowMonthBucketSchema = z.object({
  month: monthKeySchema,
  installmentCount: z.number().int().nonnegative(),
  totalRial: z.string(),
});

export type CashflowMonthBucketDto = z.infer<typeof CashflowMonthBucketSchema>;

export const CashflowReportSchema = z.object({
  buckets: z.array(CashflowMonthBucketSchema).length(6),
  fromMonth: monthKeySchema,
  toMonth: monthKeySchema,
  updatedAt: z.string().datetime(),
});

export type CashflowReportDto = z.infer<typeof CashflowReportSchema>;

export const CashflowReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

export type CashflowReportQueryDto = z.infer<typeof CashflowReportQuerySchema>;

export const CashflowReportMetaSchema = z.object({
  requestId: z.string().uuid().optional(),
});

export type CashflowReportMetaDto = z.infer<typeof CashflowReportMetaSchema>;

export const CashflowReportResponseSchema = z.object({
  data: CashflowReportSchema,
  meta: CashflowReportMetaSchema,
});

export type CashflowReportResponseDto = z.infer<typeof CashflowReportResponseSchema>;
