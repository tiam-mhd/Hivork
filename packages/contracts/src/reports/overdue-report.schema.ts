import { z } from 'zod';

import { bigintRialNonNegativeSchema } from '../common/money.schema.js';
import { phoneSchema } from '../common/phone.schema.js';

export const OverdueReportSortSchema = z.enum([
  'totalOverdueRial:desc',
  'overdueDays:desc',
  'displayName:asc',
]);

export type OverdueReportSortDto = z.infer<typeof OverdueReportSortSchema>;

export const OverdueReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  overdueDaysMin: z.coerce.number().int().min(0).max(3650).optional(),
  overdueDaysMax: z.coerce.number().int().min(0).max(3650).optional(),
  search: z.string().trim().max(100).optional(),
  minAmountRial: bigintRialNonNegativeSchema.optional(),
  sort: OverdueReportSortSchema.default('totalOverdueRial:desc'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type OverdueReportQueryDto = z.infer<typeof OverdueReportQuerySchema>;

export const OverdueReportRowSchema = z.object({
  customerId: z.string().uuid(),
  displayName: z.string().nullable(),
  phone: phoneSchema,
  overdueCount: z.number().int().nonnegative(),
  totalOverdueRial: bigintRialNonNegativeSchema,
  oldestDueDate: z.string().datetime(),
  lastPaymentAt: z.string().datetime().nullable(),
  botLinked: z.boolean(),
});

export type OverdueReportRowDto = z.infer<typeof OverdueReportRowSchema>;

export const OverdueReportMetaSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export type OverdueReportMetaDto = z.infer<typeof OverdueReportMetaSchema>;

export const OverdueReportResponseSchema = z.object({
  data: z.array(OverdueReportRowSchema),
  meta: OverdueReportMetaSchema,
});

export type OverdueReportResponseDto = z.infer<typeof OverdueReportResponseSchema>;
