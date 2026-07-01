'use client';

import type {
  BranchListItemDto,
  RoleListResponseDto,
  RoleResponseDto,
  StaffListItemDto,
  StaffListResponseDto,
  StaffResponseDto,
} from '@hivork/contracts/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import type { StaffFormFieldErrors, StaffFormValues } from '@/lib/staff/staff-form.schema';
import {
  formValuesToCreateDto,
  formValuesToUpdateDto,
  validateStaffForm,
} from '@/lib/staff/staff-form.schema';
import {
  buildStaffQueryString,
  DEFAULT_STAFF_FILTERS,
  mapStaffDeleteError,
  type StaffListFilters,
} from '@/lib/staff/staff.utils';

type DeleteStaffResponse = {
  id: string;
  deletedAt: string;
};

export function useStaff(currentStaffId: string | undefined) {
  const { resolve } = useApiError();
  const requestIdRef = useRef(0);

  const [items, setItems] = useState<StaffListItemDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filters, setFilters] = useState<StaffListFilters>(DEFAULT_STAFF_FILTERS);
  const [fieldErrors, setFieldErrors] = useState<StaffFormFieldErrors>({});

  const [roles, setRoles] = useState<RoleResponseDto[]>([]);
  const [branches, setBranches] = useState<BranchListItemDto[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState<string | null>(null);

  const branchesById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  const fetchLookups = useCallback(async () => {
    setLookupsLoading(true);
    setLookupsError(null);

    try {
      const [rolesResponse, branchesResponse] = await Promise.all([
        apiFetch<RoleListResponseDto>('/roles'),
        apiFetch<{ data: BranchListItemDto[] }>('/branches?limit=100&sort=name:asc'),
      ]);

      setRoles(rolesResponse.data);
      setBranches(branchesResponse.data.filter((branch) => branch.isActive));
    } catch (err) {
      setLookupsError(resolve(err));
      setRoles([]);
      setBranches([]);
    } finally {
      setLookupsLoading(false);
    }
  }, [resolve]);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  const fetchPage = useCallback(
    async (activeFilters: StaffListFilters, cursor?: string, append = false) => {
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
        const response = await apiFetch<StaffListResponseDto>(
          `/staff${buildStaffQueryString(activeFilters, cursor)}`,
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
    void fetchPage(filters);
  }, [fetchPage, filters]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) {
      return;
    }
    void fetchPage(filters, nextCursor, true);
  }, [fetchPage, filters, loadingMore, nextCursor]);

  const retry = useCallback(() => {
    void fetchPage(filters);
  }, [fetchPage, filters]);

  const updateFilters = useCallback((next: StaffListFilters) => {
    setFilters(next);
  }, []);

  const fetchStaffDetail = useCallback(async (staffId: string): Promise<StaffResponseDto | null> => {
    try {
      return await apiFetch<StaffResponseDto>(`/staff/${staffId}`);
    } catch (err) {
      setToast(resolve(err));
      return null;
    }
  }, [resolve]);

  const syncStaffRole = useCallback(
    async (staffId: string, previousRoleIds: string[], nextRoleId: string): Promise<boolean> => {
      if (!nextRoleId || previousRoleIds.includes(nextRoleId)) {
        return true;
      }

      try {
        for (const roleId of previousRoleIds) {
          if (roleId !== nextRoleId) {
            await apiFetch(`/staff/${staffId}/roles/${roleId}`, { method: 'DELETE' });
          }
        }

        if (!previousRoleIds.includes(nextRoleId)) {
          await apiFetch(`/staff/${staffId}/roles`, {
            method: 'POST',
            body: JSON.stringify({ roleId: nextRoleId }),
          });
        }

        return true;
      } catch (err) {
        if (err instanceof ApiClientError && err.code === 'STAFF_LAST_OWNER') {
          setToast('نقش مالک قابل تغییر نیست.');
          return false;
        }

        setToast(resolve(err));
        return false;
      }
    },
    [resolve],
  );

  const createStaff = useCallback(
    async (values: StaffFormValues): Promise<boolean> => {
      const validationErrors = validateStaffForm(values, {
        mode: 'create',
        roles,
      });
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return false;
      }

      setSaving(true);
      setFieldErrors({});

      try {
        await apiFetch<StaffResponseDto>('/staff', {
          method: 'POST',
          body: JSON.stringify(formValuesToCreateDto(values)),
        });

        await fetchPage(filters);
        setToast('کارمند ثبت شد. می‌تواند با OTP وارد شود.');
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.code === 'STAFF_PHONE_DUPLICATE' || err.code === 'STAFF_PHONE_EXISTS') {
            setFieldErrors({ phone: 'این شماره قبلاً در تیم ثبت شده است.' });
            return false;
          }
          if (err.code === 'INVALID_PHONE' || err.code === 'PHONE_INVALID') {
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
    [fetchPage, filters, resolve, roles],
  );

  const updateStaff = useCallback(
    async (
      staffId: string,
      values: StaffFormValues,
      previousRoleIds: string[],
      lockRole: boolean,
    ): Promise<boolean> => {
      const validationErrors = validateStaffForm(values, {
        mode: 'edit',
        roles,
        lockRole,
      });
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return false;
      }

      setSaving(true);
      setFieldErrors({});

      try {
        await apiFetch<StaffResponseDto>(`/staff/${staffId}`, {
          method: 'PATCH',
          body: JSON.stringify(formValuesToUpdateDto(values)),
        });

        if (!lockRole && values.roleId) {
          const roleSynced = await syncStaffRole(staffId, previousRoleIds, values.roleId);
          if (!roleSynced) {
            return false;
          }
        }

        await fetchPage(filters);
        setToast('تغییرات کارمند ذخیره شد.');
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setToast(err.message);
          return false;
        }

        setToast(resolve(err));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchPage, filters, resolve, roles, syncStaffRole],
  );

  const deleteStaff = useCallback(
    async (staff: StaffListItemDto): Promise<boolean> => {
      setDeleting(true);

      try {
        await apiFetch<DeleteStaffResponse>(`/staff/${staff.id}`, {
          method: 'DELETE',
        });

        await fetchPage(filters);
        setToast(`کارمند «${staff.name}» حذف شد.`);
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setToast(mapStaffDeleteError(err.code));
          return false;
        }

        setToast(resolve(err));
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [fetchPage, filters, resolve],
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
    filters,
    fieldErrors,
    roles,
    branches,
    branchesById,
    lookupsLoading,
    lookupsError,
    currentStaffId,
    setFilters: updateFilters,
    loadMore,
    retry,
    fetchStaffDetail,
    createStaff,
    updateStaff,
    deleteStaff,
    clearToast,
    clearFieldErrors,
    refetchLookups: fetchLookups,
  };
}
