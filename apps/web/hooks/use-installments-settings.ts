'use client';

import type {
  GetInstallmentsSettingsApiResponseDto,
  InstallmentsSettingsReadDto,
} from '@hivork/contracts/installments';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import {
  DEFAULT_INSTALLMENTS_SETTINGS_FORM_VALUES,
  installmentsSettingsAreEqual,
  mapInstallmentsSettingsError,
  toInstallmentsPatchPayload,
  toInstallmentsSettingsFormValues,
  type InstallmentsSettingsFieldErrors,
  type InstallmentsSettingsFormValues,
} from '@/lib/settings/installments-settings';

type UseInstallmentsSettingsState = {
  values: InstallmentsSettingsFormValues;
  savedValues: InstallmentsSettingsFormValues;
  loading: boolean;
  saving: boolean;
  error: string | null;
  forbidden: boolean;
  moduleDisabled: boolean;
  tenantSuspended: boolean;
  versionConflict: boolean;
  toast: string | null;
  fieldErrors: InstallmentsSettingsFieldErrors;
};

type ZodIssueLike = {
  path: Array<string | number>;
  message: string;
};

function isZodLikeError(error: unknown): error is { issues: ZodIssueLike[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

export function useInstallmentsSettings() {
  const { resolve } = useApiError();
  const baselineRef = useRef(DEFAULT_INSTALLMENTS_SETTINGS_FORM_VALUES);

  const [state, setState] = useState<UseInstallmentsSettingsState>({
    values: DEFAULT_INSTALLMENTS_SETTINGS_FORM_VALUES,
    savedValues: DEFAULT_INSTALLMENTS_SETTINGS_FORM_VALUES,
    loading: true,
    saving: false,
    error: null,
    forbidden: false,
    moduleDisabled: false,
    tenantSuspended: false,
    versionConflict: false,
    toast: null,
    fieldErrors: {},
  });

  const load = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      fieldErrors: {},
      forbidden: false,
      moduleDisabled: false,
      tenantSuspended: false,
      versionConflict: false,
    }));

    try {
      const response = await apiFetch<GetInstallmentsSettingsApiResponseDto>('/settings/installments');
      const nextValues = toInstallmentsSettingsFormValues(
        response.data.installments as InstallmentsSettingsReadDto,
      );
      baselineRef.current = nextValues;
      setState((prev) => ({
        ...prev,
        values: nextValues,
        savedValues: nextValues,
        loading: false,
      }));
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        if (err.code === 'MODULE_NOT_ENABLED') {
          setState((prev) => ({ ...prev, loading: false, moduleDisabled: true }));
          return;
        }

        if (err.code === 'TENANT_SUSPENDED') {
          setState((prev) => ({ ...prev, loading: false, tenantSuspended: true }));
          return;
        }

        setState((prev) => ({ ...prev, loading: false, forbidden: true }));
        return;
      }

      setState((prev) => ({ ...prev, loading: false, error: resolve(err) }));
    }
  }, [resolve]);

  useEffect(() => {
    void load();
  }, [load]);

  const setValues = useCallback((next: InstallmentsSettingsFormValues) => {
    setState((prev) => ({
      ...prev,
      values: next,
      fieldErrors: {},
      versionConflict: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      values: baselineRef.current,
      fieldErrors: {},
      versionConflict: false,
    }));
  }, []);

  const clearToast = useCallback(() => {
    setState((prev) => ({ ...prev, toast: null }));
  }, []);

  const save = useCallback(async () => {
    try {
      const patch = toInstallmentsPatchPayload(state.values, state.savedValues);
      setState((prev) => ({
        ...prev,
        saving: true,
        error: null,
        fieldErrors: {},
        versionConflict: false,
      }));

      const response = await apiFetch<GetInstallmentsSettingsApiResponseDto>('/settings/installments', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const saved = toInstallmentsSettingsFormValues(
        response.data.installments as InstallmentsSettingsReadDto,
      );
      baselineRef.current = saved;
      setState((prev) => ({
        ...prev,
        values: saved,
        savedValues: saved,
        saving: false,
        toast: 'تنظیمات اقساط با موفقیت ذخیره شد.',
      }));
      return true;
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'OPTIMISTIC_LOCK_CONFLICT') {
        setState((prev) => ({
          ...prev,
          saving: false,
          versionConflict: true,
          toast: 'تنظیمات توسط شخص دیگری تغییر کرده است. در حال بارگذاری مجدد...',
        }));
        await load();
        return false;
      }

      if (err instanceof ApiClientError && err.code === 'SETTING_VALUE_INVALID') {
        setState((prev) => ({
          ...prev,
          saving: false,
          toast: err.message || 'مقدار تنظیمات نامعتبر است.',
        }));
        return false;
      }

      if (isZodLikeError(err)) {
        const nextFieldErrors: InstallmentsSettingsFieldErrors = {};
        for (const issue of err.issues) {
          const field = issue.path[0];
          if (typeof field === 'string' && !nextFieldErrors[field as keyof InstallmentsSettingsFieldErrors]) {
            nextFieldErrors[field as keyof InstallmentsSettingsFieldErrors] =
              mapInstallmentsSettingsError(issue.message);
          }
        }
        setState((prev) => ({
          ...prev,
          saving: false,
          fieldErrors: nextFieldErrors,
        }));
        return false;
      }

      if (err instanceof Error) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: resolve(err),
          toast: resolve(err),
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        saving: false,
        fieldErrors: prev.fieldErrors,
      }));
      return false;
    }
  }, [load, resolve, state.savedValues, state.values]);

  const isDirty = !installmentsSettingsAreEqual(state.values, state.savedValues);

  return {
    ...state,
    isDirty,
    load,
    setValues,
    reset,
    save,
    clearToast,
    mapErrorMessage: mapInstallmentsSettingsError,
  };
}
