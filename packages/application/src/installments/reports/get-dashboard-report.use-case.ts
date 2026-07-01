import { UseCase } from '../../core/use-case.js';
import type {
  DashboardReportAggregates,
  IDashboardReportRepository,
} from '../../ports/dashboard-report.repository.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ITenantRepository } from '../../ports/tenant.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import {
  getCalendarMonthRangeInTimezone,
  getTodayUtcRangeInTimezone,
  TEHRAN_TIMEZONE,
} from '../installments/tehran-day-range.js';
import { resolveSaleListScope } from '../sales/sale-data-scope.js';
import { buildDashboardScopeHash } from './dashboard-scope-hash.js';

export const DASHBOARD_REPORT_CACHE_TTL_SECONDS = 300;

export type DashboardReport = {
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

export type GetDashboardReportInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  activeBranchId?: string;
};

export type GetDashboardReportOutput = {
  data: DashboardReport;
  meta: {
    cached: boolean;
    cacheExpiresAt?: string;
  };
};

function emptyAggregates(): DashboardReportAggregates {
  return {
    todayDueCount: 0,
    todayDueAmountRial: 0n,
    overdueCount: 0,
    overdueAmountRial: 0n,
    pendingPaymentCount: 0,
    todayCollectedRial: 0n,
    thisMonthCollectedRial: 0n,
    activeSalesCount: 0,
    customersWithDebtCount: 0,
  };
}

function toDashboardReport(aggregates: DashboardReportAggregates, updatedAt: string): DashboardReport {
  return {
    todayDueCount: aggregates.todayDueCount,
    todayDueAmountRial: aggregates.todayDueAmountRial.toString(),
    overdueCount: aggregates.overdueCount,
    overdueAmountRial: aggregates.overdueAmountRial.toString(),
    pendingPaymentCount: aggregates.pendingPaymentCount,
    todayCollectedRial: aggregates.todayCollectedRial.toString(),
    thisMonthCollectedRial: aggregates.thisMonthCollectedRial.toString(),
    activeSalesCount: aggregates.activeSalesCount,
    customersWithDebtCount: aggregates.customersWithDebtCount,
    updatedAt,
  };
}

export class GetDashboardReportUseCase
  implements UseCase<GetDashboardReportInput, GetDashboardReportOutput>
{
  constructor(
    private readonly reports: IDashboardReportRepository,
    private readonly tenants: ITenantRepository,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: GetDashboardReportInput): Promise<GetDashboardReportOutput> {
    const scope = resolveSaleListScope(input.staffContext, input.actorId, {
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });
    const scopeHash = buildDashboardScopeHash(scope);

    const cached = await this.tryGetCache(input.tenantId, scopeHash);
    if (cached) {
      return {
        data: cached.payload,
        meta: {
          cached: true,
          cacheExpiresAt: cached.expiresAt,
        },
      };
    }

    if (this.isEmptyBranchScope(input.staffContext, input.branchId, input.activeBranchId)) {
      const updatedAt = new Date().toISOString();
      const data = toDashboardReport(emptyAggregates(), updatedAt);
      await this.trySetCache(input.tenantId, scopeHash, data);
      return { data, meta: { cached: false } };
    }

    const tenant = await this.tenants.findDetailById(input.tenantId);
    const timezone = tenant?.timezone ?? TEHRAN_TIMEZONE;
    const now = new Date();
    const today = getTodayUtcRangeInTimezone(now, timezone);
    const month = getCalendarMonthRangeInTimezone(now, timezone);

    const aggregates = await this.reports.getAggregates(
      input.tenantId,
      scope,
      {
        todayFrom: today.from,
        todayTo: today.to,
        monthFrom: month.from,
        monthTo: month.to,
      },
    );

    const updatedAt = now.toISOString();
    const data = toDashboardReport(aggregates, updatedAt);
    await this.trySetCache(input.tenantId, scopeHash, data);

    return { data, meta: { cached: false } };
  }

  private isEmptyBranchScope(
    staffContext: DataScopeStaffContext,
    branchId?: string,
    activeBranchId?: string,
  ): boolean {
    if (staffContext.dataScope !== 'branch') {
      return false;
    }

    if (branchId || activeBranchId) {
      return false;
    }

    return resolveEffectiveBranchIds(staffContext).length === 0;
  }

  private async tryGetCache(
    tenantId: string,
    scopeHash: string,
  ): Promise<{ payload: DashboardReport; expiresAt: string } | null> {
    if (!this.reportCache) {
      return null;
    }

    try {
      return await this.reportCache.getDashboard(tenantId, scopeHash);
    } catch {
      return null;
    }
  }

  private async trySetCache(
    tenantId: string,
    scopeHash: string,
    data: DashboardReport,
  ): Promise<void> {
    if (!this.reportCache) {
      return;
    }

    const expiresAt = new Date(
      Date.now() + DASHBOARD_REPORT_CACHE_TTL_SECONDS * 1_000,
    ).toISOString();

    try {
      await this.reportCache.setDashboard(
        tenantId,
        scopeHash,
        { payload: data, expiresAt },
        DASHBOARD_REPORT_CACHE_TTL_SECONDS,
      );
    } catch {
      // degraded — serve live result without cache
    }
  }
}
