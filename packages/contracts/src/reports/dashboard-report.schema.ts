import { z } from 'zod';

export const DashboardReportSchema = z.object({
  todayDueCount: z.number().int().nonnegative(),
  todayDueAmountRial: z.string(),
  overdueCount: z.number().int().nonnegative(),
  overdueAmountRial: z.string(),
  pendingPaymentCount: z.number().int().nonnegative(),
  todayCollectedRial: z.string(),
  thisMonthCollectedRial: z.string(),
  activeSalesCount: z.number().int().nonnegative(),
  customersWithDebtCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type DashboardReportDto = z.infer<typeof DashboardReportSchema>;

export const DashboardReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

export type DashboardReportQueryDto = z.infer<typeof DashboardReportQuerySchema>;

export const DashboardReportMetaSchema = z.object({
  requestId: z.string().uuid().optional(),
  cached: z.boolean(),
  cacheExpiresAt: z.string().datetime().optional(),
});

export type DashboardReportMetaDto = z.infer<typeof DashboardReportMetaSchema>;

export const DashboardReportResponseSchema = z.object({
  data: DashboardReportSchema,
  meta: DashboardReportMetaSchema,
});

export type DashboardReportResponseDto = z.infer<typeof DashboardReportResponseSchema>;
