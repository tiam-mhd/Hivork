'use client';

import type { TodayDueReportResponseDto } from '@hivork/contracts/reports';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useActiveBranch } from '@/hooks/use-active-branch';
import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import {
  buildTodayDueReportQueryString,
  filtersToUrlParams,
  hasActiveTodayDueFilters,
  parseLimitParam,
  type TodayDueReportFiltersState,
} from '@/lib/reports/today-due-report.utils';

function filtersFromSearchParams(
  params: URLSearchParams,
  defaultBranchId: string | null,
): TodayDueReportFiltersState {
  return {
    search: params.get('search') ?? '',
    branchId: params.has('branchId') ? (params.get('branchId') ?? '') : (defaultBranchId ?? ''),
    limit: parseLimitParam(params.get('limit')),
  };
}

export function useTodayDueReport() {
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

  const [items, setItems] = useState<TodayDueReportResponseDto['data']>([]);
  const [meta, setMeta] = useState<TodayDueReportResponseDto['meta'] | null>(null);
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
    async (activeFilters: TodayDueReportFiltersState, cursor?: string, append = false) => {
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
        const response = await apiFetch<TodayDueReportResponseDto>(
          `/reports/today-due${buildTodayDueReportQueryString(activeFilters, cursor)}`,
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (append) {
          setItems((prev) => [...prev, ...response.data]);
        } else {
          setItems(response.data);
          setMeta(response.meta);
        }
        setHasMore(Boolean(response.meta.hasNext));
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
          setMeta(null);
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

  const filterKey = [filters.search, filters.branchId, filters.limit].join('|');

  useEffect(() => {
    if (!defaultsAppliedRef.current) {
      return;
    }
    void fetchPage(filters);
  }, [filterKey, fetchPage, filters]);

  const setFilters = useCallback(
    (next: TodayDueReportFiltersState) => {
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
      branchId: activeBranchId ?? '',
      limit: filters.limit,
    });
  }, [activeBranchId, filters.limit, setFilters]);

  const hasActiveFilters = hasActiveTodayDueFilters(filters, activeBranchId);
  const isEmpty = !loading && !error && items.length === 0;
  const emptyVariant: 'no-results' | 'no-dues' = hasActiveFilters ? 'no-results' : 'no-dues';

  return {
    filters,
    setFilters,
    clearFilters,
    items,
    meta,
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
