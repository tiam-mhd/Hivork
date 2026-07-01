import type { InstallmentSummaryDto } from '@hivork/contracts/installments';

export const DEFAULT_TODAY_DUE_REPORT_LIMIT = 20;

export type TodayDueReportFiltersState = {
  branchId: string;
  search: string;
  limit: number;
};

export function parseLimitParam(value: string | null): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
    return parsed;
  }
  return DEFAULT_TODAY_DUE_REPORT_LIMIT;
}

export function buildTodayDueReportQueryString(
  filters: TodayDueReportFiltersState,
  cursor?: string,
): string {
  const params = new URLSearchParams();

  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.limit !== DEFAULT_TODAY_DUE_REPORT_LIMIT) {
    params.set('limit', String(filters.limit));
  }
  if (cursor) {
    params.set('cursor', cursor);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function filtersToUrlParams(filters: TodayDueReportFiltersState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.limit !== DEFAULT_TODAY_DUE_REPORT_LIMIT) {
    params.set('limit', String(filters.limit));
  }

  return params;
}

export function hasActiveTodayDueFilters(
  filters: TodayDueReportFiltersState,
  defaultBranchId: string | null,
): boolean {
  const defaultBranch = defaultBranchId ?? '';
  return filters.search.trim().length > 0 || filters.branchId !== defaultBranch;
}

/** Sum loaded installment amounts — useful for validating page totals in tests. */
export function sumTodayDueAmountRial(items: InstallmentSummaryDto[]): bigint {
  return items.reduce((sum, item) => sum + BigInt(item.amountRial), 0n);
}

export function buildTodayDueViewAllHref(branchId: string | null | undefined): string {
  if (branchId) {
    return `/admin/reports/today-due?branchId=${branchId}`;
  }
  return '/admin/reports/today-due';
}
