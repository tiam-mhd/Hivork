'use client';

import type { InstallmentSummaryDto } from '@hivork/contracts/installments';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useActiveBranch } from '@/hooks/use-active-branch';
import { useApiError } from '@/hooks/use-api-error';
import { fetchInstallmentsList } from '@/lib/api/installments';
import { ApiClientError } from '@/lib/api/client';
import {
  buildInstallmentsQueryString,
  DEFAULT_INSTALLMENTS_LIST_LIMIT,
  filtersToUrlParams,
  hasActiveInstallmentsFilters,
  parseLimitParam,
  parseSortParam,
  parseStatusParam,
  type InstallmentsListFiltersState,
} from '@/lib/installments/installments-list.utils';

function filtersFromSearchParams(
  params: URLSearchParams,
  defaultBranchId: string | null,
): InstallmentsListFiltersState {
  return {
    search: params.get('search') ?? '',
    statuses: parseStatusParam(params.get('status')),
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    branchId: params.has('branchId') ? (params.get('branchId') ?? '') : (defaultBranchId ?? ''),
    saleId: params.get('saleId') ?? '',
    sort: parseSortParam(params.get('sort')),
    limit: parseLimitParam(params.get('limit')),
  };
}

export function useInstallmentsList(initialSaleId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolve } = useApiError();
  const { activeBranchId, branches } = useActiveBranch();
  const defaultsAppliedRef = useRef(false);

  const filters = useMemo(() => {
    const base = filtersFromSearchParams(searchParams, activeBranchId);
    if (initialSaleId && !base.saleId) {
      return { ...base, saleId: initialSaleId };
    }
    return base;
  }, [searchParams, activeBranchId, initialSaleId]);

  const [items, setItems] = useState<InstallmentSummaryDto[]>([]);
  const [meta, setMeta] = useState<{ total?: number; hasNext?: boolean; nextCursor?: string | null } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (defaultsAppliedRef.current || initialSaleId) {
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
  }, [activeBranchId, initialSaleId, pathname, router, searchParams]);

  const fetchPage = useCallback(
    async (activeFilters: InstallmentsListFiltersState, cursor?: string, append = false) => {
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
        const response = await fetchInstallmentsList(
          buildInstallmentsQueryString(activeFilters, cursor),
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (append) {
          setItems((prev) => [...prev, ...response.data]);
        } else {
          setItems(response.data);
        }

        setMeta(response.meta);
        setHasMore(Boolean(response.meta.hasNext));
        setNextCursor(response.meta.nextCursor ?? null);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (err instanceof ApiClientError && err.httpStatus === 403) {
          setForbidden(true);
          setItems([]);
          return;
        }

        setError(resolve(err));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [resolve],
  );

  useEffect(() => {
    void fetchPage(filters);
  }, [fetchPage, filters]);

  const setFilters = useCallback(
    (next: InstallmentsListFiltersState) => {
      const params = filtersToUrlParams(next);
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    },
    [pathname, router],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (activeBranchId) {
      params.set('branchId', activeBranchId);
    }
    if (initialSaleId) {
      params.set('saleId', initialSaleId);
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [activeBranchId, initialSaleId, pathname, router]);

  const retry = useCallback(() => {
    void fetchPage(filters);
  }, [fetchPage, filters]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) {
      return;
    }

    void fetchPage(filters, nextCursor, true);
  }, [fetchPage, filters, loadingMore, nextCursor]);

  const refresh = useCallback(() => {
    void fetchPage(filters);
  }, [fetchPage, filters]);

  const isEmpty = !loading && !error && items.length === 0;
  const hasActiveFilters = hasActiveInstallmentsFilters(filters);

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
    refresh,
    isEmpty,
    hasActiveFilters,
    branches,
    defaultLimit: DEFAULT_INSTALLMENTS_LIST_LIMIT,
  };
}
