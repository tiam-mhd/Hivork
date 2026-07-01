'use client';

import type { OverdueReportResponseDto } from '@hivork/contracts/reports';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { OverdueReportFiltersState } from '@/lib/reports/overdue-report.utils';
import { useActiveBranch } from '@/hooks/use-active-branch';
import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import {
  buildOverdueReportQueryString,
  filtersToUrlParams,
  hasActiveOverdueFilters,
  parseLimitParam,
  parseMinAmountRialParam,
  parseOverdueDaysParam,
  parseSortParam,
} from '@/lib/reports/overdue-report.utils';

function filtersFromSearchParams(
  params: URLSearchParams,
  defaultBranchId: string | null,
): OverdueReportFiltersState {
  return {
    search: params.get('search') ?? '',
    overdueDaysMin: parseOverdueDaysParam(params.get('overdueDaysMin')),
    overdueDaysMax: parseOverdueDaysParam(params.get('overdueDaysMax')),
    minAmountRial: parseMinAmountRialParam(params.get('minAmountRial')),
    branchId: params.has('branchId') ? (params.get('branchId') ?? '') : (defaultBranchId ?? ''),
    sort: parseSortParam(params.get('sort')),
    limit: parseLimitParam(params.get('limit')),
  };
}

export function useOverdueReport() {
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

  const [items, setItems] = useState<OverdueReportResponseDto['data']>([]);
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

    const needsBranch = !searchParams.has('branchId') && Boolean(activeBranchId);

    if (!needsBranch) {
      defaultsAppliedRef.current = true;
      return;
    }

    if (!activeBranchId) {
      return;
    }

    defaultsAppliedRef.current = true;
    const params = new URLSearchParams(searchParams);
    params.set('branchId', activeBranchId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [activeBranchId, pathname, router, searchParams]);

  const fetchPage = useCallback(
    async (activeFilters: OverdueReportFiltersState, cursor?: string, append = false) => {
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
        const response = await apiFetch<OverdueReportResponseDto>(
          `/reports/overdue${buildOverdueReportQueryString(activeFilters, cursor)}`,
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
    filters.overdueDaysMin,
    filters.overdueDaysMax,
    filters.minAmountRial,
    filters.branchId,
    filters.sort,
    filters.limit,
  ].join('|');

  useEffect(() => {
    if (!defaultsAppliedRef.current) {
      return;
    }
    void fetchPage(filters);
  }, [filterKey, fetchPage, filters]);

  const setFilters = useCallback(
    (next: OverdueReportFiltersState) => {
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
    setFilters({
      search: '',
      overdueDaysMin: '',
      overdueDaysMax: '',
      minAmountRial: '',
      branchId: activeBranchId ?? '',
      sort: filters.sort,
      limit: filters.limit,
    });
  }, [activeBranchId, filters.limit, filters.sort, setFilters]);

  const hasActiveFilters = hasActiveOverdueFilters(filters, activeBranchId);
  const isEmpty = !loading && !error && items.length === 0;
  const emptyVariant: 'no-results' | 'no-overdue' = hasActiveFilters ? 'no-results' : 'no-overdue';

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
