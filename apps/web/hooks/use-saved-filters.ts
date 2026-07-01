'use client';

import type {
  CreateSavedFilterDto,
  SavedFilterItemDto,
  SavedFilterListResponseDto,
  SavedFilterResourceKeyDto,
  UpdateSavedFilterDto,
} from '@hivork/contracts/core';
import type { FilterAst } from '@hivork/contracts/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';

function savedFiltersQueryKey(resourceKey: SavedFilterResourceKeyDto) {
  return ['saved-filters', resourceKey] as const;
}

export function useSavedFilters(resourceKey: SavedFilterResourceKeyDto) {
  const queryClient = useQueryClient();
  const { resolve } = useApiError();

  const listQuery = useQuery({
    queryKey: savedFiltersQueryKey(resourceKey),
    queryFn: () =>
      apiFetch<SavedFilterListResponseDto>(
        `/staff/me/saved-filters?resourceKey=${encodeURIComponent(resourceKey)}`,
      ),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: savedFiltersQueryKey(resourceKey) });
  }, [queryClient, resourceKey]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateSavedFilterDto) =>
      apiFetch<SavedFilterItemDto>('/staff/me/saved-filters', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSavedFilterDto }) =>
      apiFetch<SavedFilterItemDto>(`/staff/me/saved-filters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/staff/me/saved-filters/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      }),
    onSuccess: invalidate,
  });

  const defaultFilter = listQuery.data?.items.find((item) => item.isDefault) ?? null;

  const createSavedFilter = useCallback(
    async (input: {
      name: string;
      description?: string;
      filterAst: FilterAst;
      isDefault?: boolean;
    }) => {
      try {
        return await createMutation.mutateAsync({
          resourceKey,
          name: input.name,
          description: input.description,
          filterAst: input.filterAst,
          isDefault: input.isDefault,
        });
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [createMutation, resolve, resourceKey],
  );

  const setAsDefault = useCallback(
    async (item: SavedFilterItemDto) => {
      try {
        return await updateMutation.mutateAsync({
          id: item.id,
          body: { isDefault: true, version: item.version },
        });
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [resolve, updateMutation],
  );

  const deleteSavedFilter = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [deleteMutation, resolve],
  );

  const forbidden =
    listQuery.isError &&
    listQuery.error instanceof ApiClientError &&
    listQuery.error.httpStatus === 403;

  return {
    items: listQuery.data?.items ?? [],
    defaultFilter,
    loading: listQuery.isLoading,
    error: listQuery.isError ? listQuery.error?.message ?? 'خطا در بارگذاری فیلترها' : null,
    forbidden,
    refetch: listQuery.refetch,
    createSavedFilter,
    setAsDefault,
    deleteSavedFilter,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
