import type { OverdueReportCursorPayload } from '../installments/reports/overdue-report-cursor.js';

export type { OverdueReportCursorPayload };
export type OverdueReportSort = 'totalOverdueRial:desc' | 'overdueDays:desc' | 'displayName:asc';

export type OverdueReportScopeFilter = {
  branchIds?: string[];
  createdByStaffId?: string;
};

export type OverdueReportListQuery = {
  scope: OverdueReportScopeFilter;
  search?: string;
  overdueDaysMin?: number;
  overdueDaysMax?: number;
  minAmountRial?: bigint;
  sort: OverdueReportSort;
  cursor?: OverdueReportCursorPayload;
  limit: number;
  todayStart: Date;
};

export type OverdueReportRow = {
  customerId: string;
  displayName: string | null;
  phone: string;
  overdueCount: number;
  totalOverdueRial: bigint;
  oldestDueDate: Date;
  lastPaymentAt: Date | null;
  botLinked: boolean;
};

export type OverdueReportListResult = {
  items: OverdueReportRow[];
  hasMore: boolean;
};

export interface IOverdueReportRepository {
  list(tenantId: string, query: OverdueReportListQuery): Promise<OverdueReportListResult>;
}
