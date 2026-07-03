import type { InstallmentStatusDto } from '@hivork/contracts/installments';

export const DEFAULT_INSTALLMENTS_LIST_LIMIT = 20;
export const DEFAULT_INSTALLMENTS_LIST_SORT = 'dueDate:asc' as const;

export type InstallmentsListFiltersState = {
  search: string;
  statuses: InstallmentStatusDto[];
  from: string;
  to: string;
  branchId: string;
  saleId: string;
  sort: 'dueDate:asc' | 'dueDate:desc' | 'sequenceNumber:asc';
  limit: number;
};

export const ALL_INSTALLMENT_STATUSES: InstallmentStatusDto[] = [
  'pending',
  'overdue',
  'paid',
  'waived',
];

export function parseLimitParam(value: string | null): number {
  if (!value) {
    return DEFAULT_INSTALLMENTS_LIST_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_INSTALLMENTS_LIST_LIMIT;
  }

  return Math.min(parsed, 100);
}

export function parseSortParam(
  value: string | null,
): InstallmentsListFiltersState['sort'] {
  if (value === 'dueDate:desc' || value === 'sequenceNumber:asc') {
    return value;
  }

  return DEFAULT_INSTALLMENTS_LIST_SORT;
}

export function parseStatusParam(value: string | null): InstallmentStatusDto[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is InstallmentStatusDto =>
      ALL_INSTALLMENT_STATUSES.includes(part as InstallmentStatusDto),
    );
}

export function serializeStatusParam(statuses: InstallmentStatusDto[]): string {
  return statuses.join(',');
}

export function hasActiveInstallmentsFilters(
  filters: InstallmentsListFiltersState,
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.statuses.length > 0 ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.branchId) ||
    Boolean(filters.saleId)
  );
}

export function buildInstallmentsQueryString(
  filters: InstallmentsListFiltersState,
  cursor?: string,
): string {
  const params = new URLSearchParams();

  if (filters.statuses.length > 0) {
    params.set('status', serializeStatusParam(filters.statuses));
  }
  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.saleId) {
    params.set('saleId', filters.saleId);
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.sort !== DEFAULT_INSTALLMENTS_LIST_SORT) {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_INSTALLMENTS_LIST_LIMIT) {
    params.set('limit', String(filters.limit));
  }
  if (cursor) {
    params.set('cursor', cursor);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function filtersToUrlParams(
  filters: InstallmentsListFiltersState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.statuses.length > 0) {
    params.set('status', serializeStatusParam(filters.statuses));
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.saleId) {
    params.set('saleId', filters.saleId);
  }
  if (filters.sort !== DEFAULT_INSTALLMENTS_LIST_SORT) {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_INSTALLMENTS_LIST_LIMIT) {
    params.set('limit', String(filters.limit));
  }

  return params;
}
