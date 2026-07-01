'use client';

import type { BranchListItemDto, BranchListResponseDto, BranchResponseDto } from '@hivork/contracts/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import type { BranchFormFieldErrors, BranchFormValues } from '@/lib/branches/branch-form.schema';
import {
  formValuesToCreateDto,
  formValuesToUpdateDto,
  validateBranchForm,
} from '@/lib/branches/branch-form.schema';
import {
  buildBranchesQueryString,
  mapBranchDeleteError,
} from '@/lib/branches/branches.utils';
import { useAdminSession } from '@/lib/layout/admin-session-context';

type DeleteBranchResponse = {
  id: string;
  deletedAt: string;
};

export function useBranches() {
  const { resolve } = useApiError();
  const { refetch: refetchSession } = useAdminSession();
  const requestIdRef = useRef(0);

  const [items, setItems] = useState<BranchListItemDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fieldErrors, setFieldErrors] = useState<BranchFormFieldErrors>({});

  const fetchPage = useCallback(
    async (cursor?: string, append = false) => {
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
        const response = await apiFetch<BranchListResponseDto>(
          `/branches${buildBranchesQueryString(cursor)}`,
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (append) {
          setItems((prev) => [...prev, ...response.data]);
        } else {
          setItems(response.data);
        }
        setHasMore(Boolean(response.meta.hasNext));
        setNextCursor(response.meta.nextCursor ?? null);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (err instanceof ApiClientError && err.httpStatus === 403) {
          setForbidden(true);
        } else {
          setError(resolve(err));
        }

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
        } else {
          setLoading(false);
        }
      }
    },
    [resolve],
  );

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) {
      return;
    }
    void fetchPage(nextCursor, true);
  }, [fetchPage, loadingMore, nextCursor]);

  const retry = useCallback(() => {
    void fetchPage();
  }, [fetchPage]);

  const createBranch = useCallback(
    async (values: BranchFormValues): Promise<boolean> => {
      const validationErrors = validateBranchForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return false;
      }

      setSaving(true);
      setFieldErrors({});

      try {
        await apiFetch<BranchResponseDto>('/branches', {
          method: 'POST',
          body: JSON.stringify(formValuesToCreateDto(values)),
        });

        await fetchPage();
        await refetchSession();
        setToast('شعبه جدید با موفقیت ثبت شد.');
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.code === 'VALIDATION_ERROR' && err.details?.field === 'name') {
            setFieldErrors({ name: 'نام شعبه تکراری است.' });
            return false;
          }
          if (err.code === 'INVALID_PHONE') {
            setFieldErrors({ phone: 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.' });
            return false;
          }
          setToast(err.message);
          return false;
        }

        setToast(resolve(err));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchPage, refetchSession, resolve],
  );

  const updateBranch = useCallback(
    async (branchId: string, values: BranchFormValues): Promise<boolean> => {
      const validationErrors = validateBranchForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return false;
      }

      setSaving(true);
      setFieldErrors({});

      try {
        await apiFetch<BranchResponseDto>(`/branches/${branchId}`, {
          method: 'PATCH',
          body: JSON.stringify(formValuesToUpdateDto(values)),
        });

        await fetchPage();
        await refetchSession();
        setToast('تغییرات شعبه ذخیره شد.');
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.code === 'VALIDATION_ERROR' && err.details?.field === 'name') {
            setFieldErrors({ name: 'نام شعبه تکراری است.' });
            return false;
          }
          if (err.code === 'INVALID_PHONE') {
            setFieldErrors({ phone: 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.' });
            return false;
          }
          setToast(err.message);
          return false;
        }

        setToast(resolve(err));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchPage, refetchSession, resolve],
  );

  const deleteBranch = useCallback(
    async (branch: BranchListItemDto): Promise<boolean> => {
      setDeleting(true);

      try {
        await apiFetch<DeleteBranchResponse>(`/branches/${branch.id}`, {
          method: 'DELETE',
        });

        await fetchPage();
        await refetchSession();
        setToast(`شعبه «${branch.name}» حذف شد.`);
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setToast(mapBranchDeleteError(err.code, err.details));
          return false;
        }

        setToast(resolve(err));
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [fetchPage, refetchSession, resolve],
  );

  const clearToast = useCallback(() => setToast(null), []);
  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);

  return {
    items,
    hasMore,
    loading,
    loadingMore,
    saving,
    deleting,
    error,
    forbidden,
    toast,
    search,
    fieldErrors,
    setSearch,
    loadMore,
    retry,
    createBranch,
    updateBranch,
    deleteBranch,
    clearToast,
    clearFieldErrors,
  };
}
