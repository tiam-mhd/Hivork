export const REPORT_CACHE = Symbol('REPORT_CACHE');

export type CachedDashboardPayload = {
  todayDueCount: number;
  todayDueAmountRial: string;
  overdueCount: number;
  overdueAmountRial: string;
  pendingPaymentCount: number;
  todayCollectedRial: string;
  thisMonthCollectedRial: string;
  activeSalesCount: number;
  customersWithDebtCount: number;
  updatedAt: string;
};

export type CachedDashboardEntry = {
  payload: CachedDashboardPayload;
  expiresAt: string;
};

export interface IReportCache {
  getDashboard(tenantId: string, scopeHash: string): Promise<CachedDashboardEntry | null>;
  setDashboard(
    tenantId: string,
    scopeHash: string,
    entry: CachedDashboardEntry,
    ttlSeconds: number,
  ): Promise<void>;
  invalidateTenantDashboard(tenantId: string): Promise<void>;
}
