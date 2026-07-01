'use client';

import type { RoleListResponseDto, RoleResponseDto } from '@hivork/contracts/core';
import { useCallback, useEffect, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import type { RoleFormFieldErrors, RoleFormValues } from '@/lib/roles/role-form.schema';
import {
  formValuesToCreateDto,
  formValuesToUpdateDto,
  validateRoleForm,
} from '@/lib/roles/role-form.schema';
import { mapRoleDeleteError, mapRoleSaveError } from '@/lib/roles/roles.utils';

type DeleteRoleResponse = {
  id: string;
  deletedAt: string;
};

export function useRolesList() {
  const { resolve } = useApiError();
  const [items, setItems] = useState<RoleResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const response = await apiFetch<RoleListResponseDto>('/roles');
      setItems(response.data);
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        setForbidden(true);
      } else {
        setError(resolve(err));
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resolve]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const deleteRole = useCallback(
    async (role: RoleResponseDto): Promise<boolean> => {
      setDeleting(true);

      try {
        await apiFetch<DeleteRoleResponse>(`/roles/${role.id}`, {
          method: 'DELETE',
        });

        await fetchRoles();
        setToast(`نقش «${role.name}» حذف شد.`);
        return true;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setToast(mapRoleDeleteError(err.code, err.details));
          return false;
        }

        setToast(resolve(err));
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [fetchRoles, resolve],
  );

  const clearToast = useCallback(() => setToast(null), []);

  return {
    items,
    loading,
    error,
    forbidden,
    toast,
    deleting,
    retry: fetchRoles,
    deleteRole,
    clearToast,
  };
}

export function useRoleDetail(roleId: string | null) {
  const { resolve } = useApiError();
  const [role, setRole] = useState<RoleResponseDto | null>(null);
  const [loading, setLoading] = useState(Boolean(roleId));
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchRole = useCallback(async () => {
    if (!roleId) {
      return null;
    }

    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const response = await apiFetch<RoleResponseDto>(`/roles/${roleId}`);
      setRole(response);
      return response;
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        setForbidden(true);
      } else {
        setError(resolve(err));
      }
      setRole(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [resolve, roleId]);

  useEffect(() => {
    void fetchRole();
  }, [fetchRole]);

  return { role, loading, error, forbidden, refetch: fetchRole };
}

export function useRoleMutation() {
  const { resolve } = useApiError();
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RoleFormFieldErrors>({});
  const [toast, setToast] = useState<string | null>(null);

  const createRole = useCallback(
    async (values: RoleFormValues): Promise<RoleResponseDto | null> => {
      const validationErrors = validateRoleForm(values, 'create');
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return null;
      }

      setSaving(true);
      setFieldErrors({});

      try {
        const created = await apiFetch<RoleResponseDto>('/roles', {
          method: 'POST',
          body: JSON.stringify(formValuesToCreateDto(values)),
        });
        return created;
      } catch (err) {
        if (err instanceof ApiClientError) {
          const mapped = mapRoleSaveError(err.code);
          if (mapped && err.details?.field === 'code') {
            setFieldErrors({ code: mapped });
            return null;
          }
          if (mapped) {
            setToast(mapped);
            return null;
          }
          if (err.code === 'VALIDATION_ERROR') {
            setFieldErrors({ permissions: 'حداقل یک مجوز انتخاب کنید.' });
            return null;
          }
          setToast(err.message);
          return null;
        }

        setToast(resolve(err));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [resolve],
  );

  const updateRole = useCallback(
    async (roleId: string, values: RoleFormValues): Promise<RoleResponseDto | null> => {
      const validationErrors = validateRoleForm(values, 'edit');
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return null;
      }

      setSaving(true);
      setFieldErrors({});

      try {
        const updated = await apiFetch<RoleResponseDto>(`/roles/${roleId}`, {
          method: 'PATCH',
          body: JSON.stringify(formValuesToUpdateDto(values)),
        });
        return updated;
      } catch (err) {
        if (err instanceof ApiClientError) {
          const mapped = mapRoleSaveError(err.code);
          if (mapped) {
            setToast(mapped);
            return null;
          }
          if (err.code === 'VALIDATION_ERROR') {
            setFieldErrors({ permissions: 'حداقل یک مجوز انتخاب کنید.' });
            return null;
          }
          setToast(err.message);
          return null;
        }

        setToast(resolve(err));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [resolve],
  );

  const clearToast = useCallback(() => setToast(null), []);
  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);

  return {
    saving,
    fieldErrors,
    toast,
    createRole,
    updateRole,
    clearToast,
    clearFieldErrors,
  };
}
