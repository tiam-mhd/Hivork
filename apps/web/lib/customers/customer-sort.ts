import type { DataTableSortDir } from '@hivork/contracts/ui';
import type { TenantCustomerListSortDto } from '@hivork/contracts/customers';

export const CUSTOMER_SORT_WHITELIST = [
  'createdAt',
  'name',
  'lastPurchaseAt',
  'overdueCount',
] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_WHITELIST)[number];

const API_SORT_VALUES: TenantCustomerListSortDto[] = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'lastPurchaseAt:desc',
  'lastPurchaseAt:asc',
  'overdueCount:desc',
  'overdueCount:asc',
];

export const DEFAULT_CUSTOMER_SORT: TenantCustomerListSortDto = 'createdAt:desc';

export function customerSortToApi(
  sortBy?: string,
  sortDir?: DataTableSortDir,
): TenantCustomerListSortDto {
  if (!sortBy || !sortDir) {
    return DEFAULT_CUSTOMER_SORT;
  }

  const candidate = `${sortBy}:${sortDir}` as TenantCustomerListSortDto;
  if (API_SORT_VALUES.includes(candidate)) {
    return candidate;
  }

  return DEFAULT_CUSTOMER_SORT;
}

export function customerSortFromApi(sort: TenantCustomerListSortDto): {
  sortBy: string;
  sortDir: DataTableSortDir;
} {
  const [sortBy, sortDir] = sort.split(':') as [string, DataTableSortDir];
  return { sortBy, sortDir };
}

export function parseCustomerSortParam(value: string | null): TenantCustomerListSortDto {
  if (value && API_SORT_VALUES.includes(value as TenantCustomerListSortDto)) {
    return value as TenantCustomerListSortDto;
  }
  return DEFAULT_CUSTOMER_SORT;
}

export function customerSortToParam(sortBy?: string, sortDir?: DataTableSortDir): TenantCustomerListSortDto {
  return customerSortToApi(sortBy, sortDir);
}
