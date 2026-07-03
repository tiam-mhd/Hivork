'use client';

import type { CheckStatusDto, CheckSummaryDto, CheckTypeDto } from '@hivork/contracts/payments';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { ApiClientError } from '@/lib/api/client';
import { listChecks } from '@/lib/api/payments';

export type ChecksListFilters = {
  checkType?: CheckTypeDto;
  status?: CheckStatusDto;
  dueFrom?: string;
  dueTo?: string;
};

const DEFAULT_LIMIT = 20;

export function useChecksList(filters: ChecksListFilters) {
  const { resolve } = useApiError();
  const [items, setItems] = useState<CheckSummaryDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
        setForbidden(false);
      }

      try {
        const result = await listChecks({
          cursor,
          limit: DEFAULT_LIMIT,
          checkType: filters.checkType,
          status: filters.status,
          dueFrom: filters.dueFrom || undefined,
          dueTo: filters.dueTo || undefined,
        });

        if (requestId !== requestIdRef.current) return;

        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof ApiClientError && err.httpStatus === 403) {
          setForbidden(true);
          return;
        }
        setError(resolve(err));
        if (!append) setItems([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters, resolve],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return;
    void load(nextCursor, true);
  }, [hasMore, loadingMore, nextCursor, load]);

  const retry = useCallback(() => void load(), [load]);
  const refresh = useCallback(() => void load(), [load]);

  return {
    items,
    hasMore,
    loading,
    loadingMore,
    error,
    forbidden,
    retry,
    refresh,
    loadMore,
    isEmpty: !loading && !error && items.length === 0,
  };
}
