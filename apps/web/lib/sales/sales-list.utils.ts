import type { ListSalesQueryDto } from '@hivork/contracts/installments';

export const SALE_STATUS_OPTIONS = ['active', 'completed', 'cancelled'] as const;

export type SaleStatusFilter = (typeof SALE_STATUS_OPTIONS)[number];

export type SaleListSort = ListSalesQueryDto['sort'];

export const DEFAULT_SALE_LIST_SORT: SaleListSort = 'createdAt:desc';
export const DEFAULT_SALE_LIST_LIMIT = 20;

export function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function parseStatusParam(value: string | null): SaleStatusFilter[] {
  if (!value?.trim()) {
    return [];
  }

  const allowed = new Set<string>(SALE_STATUS_OPTIONS);
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is SaleStatusFilter => allowed.has(item));
}

export function serializeStatusParam(statuses: SaleStatusFilter[]): string {
  return statuses.join(',');
}

export function apiStatusFromFilters(statuses: SaleStatusFilter[]): SaleStatusFilter | undefined {
  if (statuses.length === 1) {
    return statuses[0];
  }
  return undefined;
}

export function parseSortParam(value: string | null): SaleListSort {
  const allowed: SaleListSort[] = ['createdAt:desc', 'createdAt:asc', 'contractDate:desc'];
  if (value && allowed.includes(value as SaleListSort)) {
    return value as SaleListSort;
  }
  return DEFAULT_SALE_LIST_SORT;
}

export function parseLimitParam(value: string | null): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
    return parsed;
  }
  return DEFAULT_SALE_LIST_LIMIT;
}

export function isDefaultDateRange(from: string, to: string): boolean {
  const defaults = getDefaultDateRange();
  return from === defaults.from && to === defaults.to;
}
