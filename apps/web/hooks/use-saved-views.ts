'use client';

import type {
  CreateSavedViewDto,
  ForkSavedViewDto,
  SavedViewItemDto,
  SavedViewListResponseDto,
  SavedViewResourceKeyDto,
  UpdateSavedViewDto,
} from '@hivork/contracts/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';

function savedViewsQueryKey(resourceKey: SavedViewResourceKeyDto) {
  return ['saved-views', resourceKey] as const;
}

export function useSavedViews(resourceKey: SavedViewResourceKeyDto) {
  const queryClient = useQueryClient();
  const { resolve } = useApiError();

  const listQuery = useQuery({
    queryKey: savedViewsQueryKey(resourceKey),
    queryFn: () =>
      apiFetch<SavedViewListResponseDto>(
        `/staff/me/saved-views?resourceKey=${encodeURIComponent(resourceKey)}&includeShared=true`,
      ),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: savedViewsQueryKey(resourceKey) });
  }, [queryClient, resourceKey]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateSavedViewDto) =>
      apiFetch<SavedViewItemDto>('/staff/me/saved-views', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSavedViewDto }) =>
      apiFetch<SavedViewItemDto>(`/staff/me/saved-views/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/staff/me/saved-views/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      }),
    onSuccess: invalidate,
  });

  const forkMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ForkSavedViewDto }) =>
      apiFetch<SavedViewItemDto>(`/staff/me/saved-views/${id}/fork`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const mine = listQuery.data?.mine ?? [];
  const shared = listQuery.data?.shared ?? [];
  const items = [...mine, ...shared];
  const defaultView = mine.find((item) => item.isDefault) ?? null;

  const createSavedView = useCallback(
    async (payload: CreateSavedViewDto) => {
      try {
        return await createMutation.mutateAsync(payload);
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [createMutation, resolve],
  );

  const updateSavedView = useCallback(
    async (id: string, body: UpdateSavedViewDto) => {
      try {
        return await updateMutation.mutateAsync({ id, body });
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [resolve, updateMutation],
  );

  const setAsDefault = useCallback(
    async (item: SavedViewItemDto) => {
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

  const deleteSavedView = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [deleteMutation, resolve],
  );

  const forkSavedView = useCallback(
    async (id: string, body: ForkSavedViewDto) => {
      try {
        return await forkMutation.mutateAsync({ id, body });
      } catch (error) {
        throw error instanceof Error ? error : new Error(resolve(error));
      }
    },
    [forkMutation, resolve],
  );

  const forbidden =
    listQuery.isError &&
    listQuery.error instanceof ApiClientError &&
    listQuery.error.httpStatus === 403;

  return {
    items,
    mine,
    shared,
    defaultView,
    loading: listQuery.isLoading,
    error: listQuery.isError ? listQuery.error?.message ?? 'خطا در بارگذاری نماها' : null,
    forbidden,
    refetch: listQuery.refetch,
    createSavedView,
    updateSavedView,
    setAsDefault,
    deleteSavedView,
    forkSavedView,
    isSaving: createMutation.isPending || updateMutation.isPending || forkMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
