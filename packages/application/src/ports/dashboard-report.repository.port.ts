export type DashboardReportScopeFilter = {
  branchIds?: string[];
  createdByStaffId?: string;
};

export type DashboardTimeBounds = {
  todayFrom: Date;
  todayTo: Date;
  monthFrom: Date;
  monthTo: Date;
};

export type DashboardReportAggregates = {
  todayDueCount: number;
  todayDueAmountRial: bigint;
  overdueCount: number;
  overdueAmountRial: bigint;
  pendingPaymentCount: number;
  todayCollectedRial: bigint;
  thisMonthCollectedRial: bigint;
  activeSalesCount: number;
  customersWithDebtCount: number;
};

export type CashflowWindowBounds = {
  from: Date;
  toExclusive: Date;
};

export type CashflowMonthAggregate = {
  month: string;
  installmentCount: number;
  totalRial: bigint;
};

export interface IDashboardReportRepository {
  getAggregates(
    tenantId: string,
    scope: DashboardReportScopeFilter,
    bounds: DashboardTimeBounds,
  ): Promise<DashboardReportAggregates>;

  getCashflowByMonth(
    tenantId: string,
    scope: DashboardReportScopeFilter,
    bounds: CashflowWindowBounds,
    timezone: string,
  ): Promise<CashflowMonthAggregate[]>;
}
