'use client';

import type { DataTableQuery, DataTableSortDir, PaginatedListResponse } from '@hivork/contracts/ui';
import { clampDataTableLimit } from '@hivork/contracts/ui';
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export type DataTableFetchParams = DataTableQuery & {
  search?: string;
  signal?: AbortSignal;
};

export type UseDataTableQueryOptions<T extends { id: string }> = {
  queryKey: QueryKey;
  fetchFn: (params: DataTableFetchParams) => Promise<PaginatedListResponse<T>>;
  defaultSort?: { sortBy: string; sortDir: DataTableSortDir };
  defaultLimit?: number;
  sortBy?: string;
  sortDir?: DataTableSortDir;
  search?: string;
  enabled?: boolean;
};

export type UseDataTableQueryResult<T extends { id: string }> = {
  items: T[];
  hasNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  totalCount?: number;
  query: UseInfiniteQueryResult<InfiniteData<PaginatedListResponse<T>>, Error>;
};

export function useDataTableQuery<T extends { id: string }>({
  queryKey,
  fetchFn,
  defaultSort,
  defaultLimit = 20,
  sortBy = defaultSort?.sortBy,
  sortDir = defaultSort?.sortDir,
  search,
  enabled = true,
}: UseDataTableQueryOptions<T>): UseDataTableQueryResult<T> {
  const limit = clampDataTableLimit(defaultLimit);
  const searchKey = search?.trim() ?? '';

  const query = useInfiniteQuery({
    queryKey: [...queryKey, { sortBy, sortDir, limit, search: searchKey }],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      fetchFn({
        cursor: pageParam,
        limit,
        sortBy,
        sortDir,
        search: searchKey || undefined,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );

  const totalCount = query.data?.pages[0]?.totalCount;

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    items,
    hasNextPage: Boolean(query.hasNextPage),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    refetch,
    totalCount,
    query,
  };
}

export {
  useClearRowSelectionOnFilterChange,
  useDataTableSelection,
} from './use-data-table-selection';
