'use client';

import type { SaleListResponseDto } from '@hivork/contracts/installments';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SaleListFiltersState } from '@/components/sales/sale-list-filters';
import { useActiveBranch } from '@/hooks/use-active-branch';
import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import {
  apiStatusFromFilters,
  DEFAULT_SALE_LIST_LIMIT,
  DEFAULT_SALE_LIST_SORT,
  getDefaultDateRange,
  parseLimitParam,
  parseSortParam,
  parseStatusParam,
  serializeStatusParam,
} from '@/lib/sales/sales-list.utils';

function filtersFromSearchParams(
  params: URLSearchParams,
  defaultBranchId: string | null,
): SaleListFiltersState {
  const { from, to } = getDefaultDateRange();

  return {
    search: params.get('search') ?? '',
    statuses: parseStatusParam(params.get('status')),
    from: params.get('from') ?? from,
    to: params.get('to') ?? to,
    branchId: params.has('branchId') ? (params.get('branchId') ?? '') : (defaultBranchId ?? ''),
    sort: parseSortParam(params.get('sort')),
    limit: parseLimitParam(params.get('limit')),
  };
}

function buildQueryString(filters: SaleListFiltersState, cursor?: string): string {
  const params = new URLSearchParams();

  const apiStatus = apiStatusFromFilters(filters.statuses);
  if (apiStatus) {
    params.set('status', apiStatus);
  } else if (filters.statuses.length > 1) {
    params.set('status', serializeStatusParam(filters.statuses));
  }
  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.sort !== DEFAULT_SALE_LIST_SORT) {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_SALE_LIST_LIMIT) {
    params.set('limit', String(filters.limit));
  }
  if (cursor) {
    params.set('cursor', cursor);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function filtersToUrlParams(filters: SaleListFiltersState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
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
  if (filters.sort !== DEFAULT_SALE_LIST_SORT) {
    params.set('sort', filters.sort);
  }
  if (filters.limit !== DEFAULT_SALE_LIST_LIMIT) {
    params.set('limit', String(filters.limit));
  }

  return params;
}

function hasActiveSalesFilters(
  filters: SaleListFiltersState,
  defaultBranchId: string | null,
): boolean {
  const defaults = getDefaultDateRange();
  const defaultBranch = defaultBranchId ?? '';

  return (
    filters.search.trim().length > 0 ||
    filters.statuses.length > 0 ||
    filters.from !== defaults.from ||
    filters.to !== defaults.to ||
    filters.branchId !== defaultBranch
  );
}

export function useSalesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolve } = useApiError();
  const { activeBranchId, branches } = useActiveBranch();
  const scrollPositionRef = useRef(0);
  const requestIdRef = useRef(0);
  const defaultsAppliedRef = useRef(false);

  const filters = useMemo(
    () => filtersFromSearchParams(searchParams, activeBranchId),
    [searchParams, activeBranchId],
  );

  const [items, setItems] = useState<SaleListResponseDto['data']>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (defaultsAppliedRef.current) {
      return;
    }

    const { from, to } = getDefaultDateRange();
    const needsFrom = !searchParams.has('from');
    const needsTo = !searchParams.has('to');
    const needsBranch = !searchParams.has('branchId') && Boolean(activeBranchId);

    if (!needsFrom && !needsTo && !needsBranch) {
      defaultsAppliedRef.current = true;
      return;
    }

    if (needsBranch && !activeBranchId) {
      return;
    }

    defaultsAppliedRef.current = true;
    const params = new URLSearchParams(searchParams);
    if (needsFrom) {
      params.set('from', from);
    }
    if (needsTo) {
      params.set('to', to);
    }
    if (needsBranch && activeBranchId) {
      params.set('branchId', activeBranchId);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [activeBranchId, pathname, router, searchParams]);

  const fetchPage = useCallback(
    async (activeFilters: SaleListFiltersState, cursor?: string, append = false) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
        setForbidden(false);
      }

      try {
        const response = await apiFetch<SaleListResponseDto>(
          `/sales${buildQueryString(activeFilters, cursor)}`,
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (append) {
          setItems((prev) => [...prev, ...response.data]);
        } else {
          setItems(response.data);
        }
        setHasMore(Boolean(response.meta.hasMore));
        setNextCursor(response.meta.nextCursor ?? null);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (err instanceof ApiClientError && err.code === 'INVALID_CURSOR') {
          await fetchPage(activeFilters, undefined, false);
          return;
        }

        if (err instanceof ApiClientError && err.httpStatus === 403) {
          setForbidden(true);
        }

        setError(resolve(err));
        if (!append) {
          setItems([]);
          setHasMore(false);
          setNextCursor(null);
        }
      } finally {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (append) {
          setLoadingMore(false);
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollPositionRef.current });
          });
        } else {
          setLoading(false);
        }
      }
    },
    [resolve],
  );

  const filterKey = [
    filters.search,
    filters.statuses.join(','),
    filters.from,
    filters.to,
    filters.branchId,
    filters.sort,
    filters.limit,
  ].join('|');

  const filtersReady =
    Boolean(filters.from && filters.to) &&
    (searchParams.has('branchId') || !activeBranchId || Boolean(filters.branchId));

  useEffect(() => {
    if (!filtersReady) {
      return;
    }
    void fetchPage(filters);
  }, [filterKey, fetchPage, filters, filtersReady]);

  const setFilters = useCallback(
    (next: SaleListFiltersState) => {
      const params = filtersToUrlParams(next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) {
      return;
    }
    scrollPositionRef.current = window.scrollY;
    void fetchPage(filters, nextCursor, true);
  }, [fetchPage, filters, loadingMore, nextCursor]);

  const retry = useCallback(() => {
    void fetchPage(filters);
  }, [fetchPage, filters]);

  const clearFilters = useCallback(() => {
    const { from, to } = getDefaultDateRange();
    setFilters({
      search: '',
      statuses: [],
      from,
      to,
      branchId: activeBranchId ?? '',
      sort: filters.sort,
      limit: filters.limit,
    });
  }, [activeBranchId, filters.limit, filters.sort, setFilters]);

  const hasActiveFilters = hasActiveSalesFilters(filters, activeBranchId);
  const isEmpty = !loading && !error && items.length === 0;
  const emptyVariant: 'no-results' | 'no-sales' = hasActiveFilters ? 'no-results' : 'no-sales';

  return {
    filters,
    setFilters,
    clearFilters,
    items,
    hasMore,
    loading,
    loadingMore,
    error,
    forbidden,
    retry,
    loadMore,
    isEmpty,
    emptyVariant,
    hasActiveFilters,
    displayedCount: items.length,
    branches,
  };
}
