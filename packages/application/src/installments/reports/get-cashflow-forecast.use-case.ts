import { UseCase } from '../../core/use-case.js';
import type { IDashboardReportRepository } from '../../ports/dashboard-report.repository.port.js';
import type { ITenantRepository } from '../../ports/tenant.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import { TEHRAN_TIMEZONE } from '../installments/tehran-day-range.js';
import { resolveSaleListScope } from '../sales/sale-data-scope.js';
import {
  getCashflowForecastWindow,
  padCashflowMonthBuckets,
} from './cashflow-month-window.js';

export type CashflowMonthBucket = {
  month: string;
  installmentCount: number;
  totalRial: string;
};

export type CashflowForecast = {
  data: CashflowMonthBucket[];
  fromMonth: string;
  toMonth: string;
  updatedAt: string;
};

export type GetCashflowForecastInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  activeBranchId?: string;
};

export type GetCashflowForecastOutput = CashflowForecast;

function emptyForecast(monthKeys: string[], fromMonth: string, toMonth: string, updatedAt: string) {
  return {
    data: padCashflowMonthBuckets(monthKeys, []),
    fromMonth,
    toMonth,
    updatedAt,
  };
}

export class GetCashflowForecastUseCase
  implements UseCase<GetCashflowForecastInput, GetCashflowForecastOutput>
{
  constructor(
    private readonly reports: IDashboardReportRepository,
    private readonly tenants: ITenantRepository,
  ) {}

  async execute(input: GetCashflowForecastInput): Promise<GetCashflowForecastOutput> {
    const scope = resolveSaleListScope(input.staffContext, input.actorId, {
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });

    const tenant = await this.tenants.findDetailById(input.tenantId);
    const timezone = tenant?.timezone ?? TEHRAN_TIMEZONE;
    const now = new Date();
    const window = getCashflowForecastWindow(now, timezone);
    const updatedAt = now.toISOString();

    if (this.isEmptyBranchScope(input.staffContext, input.branchId, input.activeBranchId)) {
      return emptyForecast(window.monthKeys, window.fromMonth, window.toMonth, updatedAt);
    }

    const aggregates = await this.reports.getCashflowByMonth(
      input.tenantId,
      scope,
      {
        from: window.from,
        toExclusive: window.toExclusive,
      },
      timezone,
    );

    return {
      data: padCashflowMonthBuckets(window.monthKeys, aggregates),
      fromMonth: window.fromMonth,
      toMonth: window.toMonth,
      updatedAt,
    };
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
}
