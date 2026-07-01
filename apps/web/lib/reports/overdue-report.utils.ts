import type { OverdueReportSortDto } from '@hivork/contracts/reports';

export const OVERDUE_REPORT_SORT_OPTIONS = [
  'totalOverdueRial:desc',
  'overdueDays:desc',
  'displayName:asc',
] as const satisfies readonly OverdueReportSortDto[];

export type OverdueReportSort = OverdueReportSortDto;

export const DEFAULT_OVERDUE_REPORT_SORT: OverdueReportSort = 'totalOverdueRial:desc';
export const DEFAULT_OVERDUE_REPORT_LIMIT = 20;

export type OverdueReportFiltersState = {
  branchId: string;
  overdueDaysMin: string;
  overdueDaysMax: string;
  search: string;
  minAmountRial: string;
  sort: OverdueReportSort;
  limit: number;
};

export function parseSortParam(value: string | null): OverdueReportSort {
  if (value && OVERDUE_REPORT_SORT_OPTIONS.includes(value as OverdueReportSort)) {
    return value as OverdueReportSort;
  }
  return DEFAULT_OVERDUE_REPORT_SORT;
}

export function parseLimitParam(value: string | null): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
    return parsed;
  }
  return DEFAULT_OVERDUE_REPORT_LIMIT;
}

export function parseOverdueDaysParam(value: string | null): string {
  if (!value?.trim()) {
    return '';
  }
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 3650) {
    return String(parsed);
  }
  return '';
}

export function parseMinAmountRialParam(value: string | null): string {
  if (!value?.trim() || !/^\d+$/.test(value)) {
    return '';
  }
  return value;
}

export function buildOverdueReportQueryString(
  filters: OverdueReportFiltersState,
  cursor?: string,
): string {
  const params = new URLSearchParams();

  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.overdueDaysMin) {
    params.set('overdueDaysMin', filters.overdueDaysMin);
  }
  if (filters.overdueDaysMax) {
    params.set('overdueDaysMax', filters.overdueDaysMax);
  }
  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.minAmountRial && filters.minAmountRial !== '0') {
    params.set('minAmountRial', filters.minAmountRial);
  }
  if (filters.sort !== DEFAULT_OVERDUE_REPORT_SORT) {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_OVERDUE_REPORT_LIMIT) {
    params.set('limit', String(filters.limit));
  }
  if (cursor) {
    params.set('cursor', cursor);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function filtersToUrlParams(filters: OverdueReportFiltersState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.overdueDaysMin) {
    params.set('overdueDaysMin', filters.overdueDaysMin);
  }
  if (filters.overdueDaysMax) {
    params.set('overdueDaysMax', filters.overdueDaysMax);
  }
  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.minAmountRial && filters.minAmountRial !== '0') {
    params.set('minAmountRial', filters.minAmountRial);
  }
  if (filters.sort !== DEFAULT_OVERDUE_REPORT_SORT) {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_OVERDUE_REPORT_LIMIT) {
    params.set('limit', String(filters.limit));
  }

  return params;
}

export function hasActiveOverdueFilters(
  filters: OverdueReportFiltersState,
  defaultBranchId: string | null,
): boolean {
  const defaultBranch = defaultBranchId ?? '';

  return (
    filters.search.trim().length > 0 ||
    filters.overdueDaysMin.length > 0 ||
    filters.overdueDaysMax.length > 0 ||
    (filters.minAmountRial.length > 0 && filters.minAmountRial !== '0') ||
    filters.branchId !== defaultBranch
  );
}

export const OVERDUE_SORT_LABELS: Record<OverdueReportSort, string> = {
  'totalOverdueRial:desc': 'مجموع معوق',
  'overdueDays:desc': 'روز معوق',
  'displayName:asc': 'نام مشتری',
};
