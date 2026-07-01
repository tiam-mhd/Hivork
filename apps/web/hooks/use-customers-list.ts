'use client';

import type { TenantCustomerListResponseDto } from '@hivork/contracts/customers';
import type { FilterAst } from '@hivork/contracts/ui';
import type { PaginatedListResponse } from '@hivork/contracts/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { CustomerListFiltersState } from '@/components/customers/customer-list-filters';
import { useApiError } from '@/hooks/use-api-error';
import { useDataTableQuery } from '@/hooks/use-data-table-query';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import {
  CUSTOMER_SORT_WHITELIST,
  customerSortFromApi,
  customerSortToApi,
  customerSortToParam,
  parseCustomerSortParam,
} from '@/lib/customers/customer-sort';
import {
  parseTagsParam,
  serializeTagsParam,
} from '@/lib/customers/customers-list.utils';
import {
  countActiveFilterConditions,
  decodeFilterAstFromUrl,
  encodeFilterAstToUrl,
} from '@/lib/filter/filter-ast.utils';
import { CUSTOMER_FILTER_FIELDS } from '@/lib/filter-fields/customers';

const DEFAULT_LIMIT = 20;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
    return parsed;
  }
  return DEFAULT_LIMIT;
}

function parseFilterAstParam(value: string | null): FilterAst | null {
  if (!value) {
    return null;
  }
  return decodeFilterAstFromUrl(value);
}

function filtersFromSearchParams(params: URLSearchParams): CustomerListFiltersState {
  return {
    search: params.get('search') ?? '',
    tags: parseTagsParam(params.get('tags')),
    sort: parseCustomerSortParam(params.get('sort')),
    limit: parseLimit(params.get('limit')),
  };
}

function buildQueryString(
  filters: CustomerListFiltersState,
  filterAst: FilterAst | null,
  cursor?: string,
): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.tags.length > 0) {
    params.set('tags', serializeTagsParam(filters.tags));
  }
  if (filters.sort !== 'createdAt:desc') {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_LIMIT) {
    params.set('limit', String(filters.limit));
  }
  if (filterAst) {
    const encoded = encodeFilterAstToUrl(filterAst);
    if (encoded) {
      params.set('filter', encoded);
    }
  }
  if (cursor) {
    params.set('cursor', cursor);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useCustomersList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolve } = useApiError();

  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const filterAst = useMemo(
    () => parseFilterAstParam(searchParams.get('filter')),
    [searchParams],
  );

  const filterAstKey = useMemo(
    () => (filterAst ? JSON.stringify(filterAst) : ''),
    [filterAst],
  );

  const { sortBy, sortDir } = useMemo(
    () => customerSortFromApi(filters.sort),
    [filters.sort],
  );

  const fetchPage = useCallback(
    async ({
      cursor,
      limit,
      sortBy: nextSortBy,
      sortDir: nextSortDir,
      signal,
    }: {
      cursor?: string;
      limit: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      search?: string;
      signal?: AbortSignal;
    }): Promise<PaginatedListResponse<TenantCustomerListResponseDto['data'][number]>> => {
      const activeFilters: CustomerListFiltersState = {
        ...filters,
        sort: customerSortToApi(nextSortBy, nextSortDir),
        limit,
      };

      try {
        const response = await apiFetch<TenantCustomerListResponseDto>(
          `/customers${buildQueryString(activeFilters, filterAst, cursor)}`,
          { signal },
        );

        return {
          items: response.data,
          nextCursor: response.meta.nextCursor,
          hasNext: response.meta.hasNext,
          totalCount: response.meta.total,
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        if (err instanceof ApiClientError && err.code === 'INVALID_CURSOR') {
          const reset = await apiFetch<TenantCustomerListResponseDto>(
            `/customers${buildQueryString({ ...activeFilters, sort: activeFilters.sort }, filterAst, undefined)}`,
            { signal },
          );
          return {
            items: reset.data,
            nextCursor: reset.meta.nextCursor,
            hasNext: reset.meta.hasNext,
            totalCount: reset.meta.total,
          };
        }
        throw err instanceof Error ? err : new Error(resolve(err));
      }
    },
    [filterAst, filters, resolve],
  );

  const tableQuery = useDataTableQuery({
    queryKey: ['customers', filters.tags.join(','), filters.limit, filterAstKey],
    fetchFn: fetchPage,
    defaultLimit: filters.limit,
    sortBy,
    sortDir,
    search: filters.search,
  });

  const replaceSearchParams = useCallback(
    (nextFilters: CustomerListFiltersState, nextFilterAst: FilterAst | null) => {
      const params = new URLSearchParams();
      if (nextFilters.search.trim()) {
        params.set('search', nextFilters.search.trim());
      }
      if (nextFilters.tags.length > 0) {
        params.set('tags', serializeTagsParam(nextFilters.tags));
      }
      if (nextFilters.sort !== 'createdAt:desc') {
        params.set('sort', nextFilters.sort);
      }
      if (nextFilters.limit !== DEFAULT_LIMIT) {
        params.set('limit', String(nextFilters.limit));
      }
      if (nextFilterAst) {
        const encoded = encodeFilterAstToUrl(nextFilterAst);
        if (encoded) {
          params.set('filter', encoded);
        }
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (next: CustomerListFiltersState) => {
      replaceSearchParams(next, filterAst);
    },
    [filterAst, replaceSearchParams],
  );

  const setFilterAst = useCallback(
    (next: FilterAst | null) => {
      replaceSearchParams(filters, next);
    },
    [filters, replaceSearchParams],
  );

  const setSort = useCallback(
    (nextSortBy?: string, nextSortDir?: 'asc' | 'desc') => {
      setFilters({
        ...filters,
        sort: customerSortToParam(nextSortBy, nextSortDir),
      });
    },
    [filters, setFilters],
  );

  const setSearch = useCallback(
    (search: string) => {
      setFilters({ ...filters, search });
    },
    [filters, setFilters],
  );

  const clearFilters = useCallback(() => {
    replaceSearchParams(
      {
        search: '',
        tags: [],
        sort: filters.sort,
        limit: filters.limit,
      },
      null,
    );
  }, [filters.limit, filters.sort, replaceSearchParams]);

  const advancedFilterCount = countActiveFilterConditions(filterAst, CUSTOMER_FILTER_FIELDS);
  const hasActiveFilters =
    filters.search.trim().length > 0 || filters.tags.length > 0 || advancedFilterCount > 0;
  const selectionResetKey = useMemo(
    () => `${filters.search.trim()}|${filters.tags.join(',')}|${filterAstKey}`,
    [filterAstKey, filters.search, filters.tags],
  );
  const isEmpty = !tableQuery.isLoading && !tableQuery.isError && tableQuery.items.length === 0;
  const emptyVariant: 'no-results' | 'no-customers' = hasActiveFilters
    ? 'no-results'
    : 'no-customers';

  const forbidden =
    tableQuery.isError &&
    tableQuery.error instanceof ApiClientError &&
    tableQuery.error.httpStatus === 403;

  return {
    filters,
    setFilters,
    setSearch,
    filterAst,
    setFilterAst,
    clearFilters,
    setSort,
    sortBy,
    sortDir,
    sortWhitelist: CUSTOMER_SORT_WHITELIST,
    items: tableQuery.items,
    hasNext: tableQuery.hasNextPage,
    total: tableQuery.totalCount,
    loading: tableQuery.isLoading,
    loadingMore: tableQuery.isFetchingNextPage,
    isSearching: tableQuery.query.isFetching && !tableQuery.isFetchingNextPage,
    error: tableQuery.isError ? tableQuery.error?.message ?? 'خطا در بارگذاری' : null,
    forbidden,
    retry: tableQuery.refetch,
    loadMore: tableQuery.fetchNextPage,
    isEmpty,
    emptyVariant,
    displayedCount: tableQuery.items.length,
    hasActiveFilters,
    selectionResetKey,
  };
}
