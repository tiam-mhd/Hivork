'use client';

import type { GetInstallmentsSettingsApiResponseDto } from '@hivork/contracts/installments';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import {
  DEFAULT_INSTALLMENTS_SETTINGS,
  type RemindersFieldErrors,
  type RemindersSettingsFormValues,
  toRemindersFormValues,
  toRemindersPatchPayload,
  validateRemindersForm,
} from '@/lib/settings/reminders-settings.schema';

export const REMINDERS_SAVE_SUCCESS_MESSAGE = 'تغییرات از فردا اعمال می‌شود';

type UseRemindersSettingsState = {
  values: RemindersSettingsFormValues;
  savedValues: RemindersSettingsFormValues;
  loading: boolean;
  saving: boolean;
  error: string | null;
  forbidden: boolean;
  moduleDisabled: boolean;
  tenantSuspended: boolean;
  versionConflict: boolean;
  toast: string | null;
  fieldErrors: RemindersFieldErrors;
};

const initialFormValues = toRemindersFormValues(DEFAULT_INSTALLMENTS_SETTINGS);

export function useRemindersSettings() {
  const { resolve } = useApiError();
  const baselineRef = useRef(initialFormValues);

  const [state, setState] = useState<UseRemindersSettingsState>({
    values: initialFormValues,
    savedValues: initialFormValues,
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
      forbidden: false,
      moduleDisabled: false,
      tenantSuspended: false,
      versionConflict: false,
      fieldErrors: {},
    }));

    try {
      const response = await apiFetch<GetInstallmentsSettingsApiResponseDto>('/settings/installments');
      const nextValues = toRemindersFormValues(response.data.installments);
      baselineRef.current = nextValues;
      setState((prev) => ({
        ...prev,
        values: nextValues,
        savedValues: nextValues,
        loading: false,
        error: null,
      }));
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        if (err.code === 'MODULE_NOT_ENABLED') {
          setState((prev) => ({
            ...prev,
            loading: false,
            moduleDisabled: true,
          }));
          return;
        }

        if (err.code === 'TENANT_SUSPENDED') {
          setState((prev) => ({
            ...prev,
            loading: false,
            tenantSuspended: true,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          forbidden: true,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: resolve(err),
      }));
    }
  }, [resolve]);

  useEffect(() => {
    void load();
  }, [load]);

  const setValues = useCallback((next: RemindersSettingsFormValues) => {
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
    const validationErrors = validateRemindersForm(state.values);
    if (Object.keys(validationErrors).length > 0) {
      setState((prev) => ({ ...prev, fieldErrors: validationErrors }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      saving: true,
      error: null,
      fieldErrors: {},
      versionConflict: false,
    }));

    try {
      const patch = toRemindersPatchPayload(state.values);
      const response = await apiFetch<GetInstallmentsSettingsApiResponseDto>('/settings/installments', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });

      const saved = toRemindersFormValues(response.data.installments);
      baselineRef.current = saved;
      setState((prev) => ({
        ...prev,
        values: saved,
        savedValues: saved,
        saving: false,
        toast: REMINDERS_SAVE_SUCCESS_MESSAGE,
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

      setState((prev) => ({
        ...prev,
        saving: false,
        error: resolve(err),
        toast: resolve(err),
      }));
      return false;
    }
  }, [load, resolve, state.values]);

  const isDirty =
    state.values.reminder_on_due_date !== state.savedValues.reminder_on_due_date ||
    state.values.reminder_time !== state.savedValues.reminder_time ||
    JSON.stringify(state.values.reminder_days_before) !==
      JSON.stringify(state.savedValues.reminder_days_before) ||
    JSON.stringify(state.values.overdue_escalation_days) !==
      JSON.stringify(state.savedValues.overdue_escalation_days) ||
    JSON.stringify(state.values.default_reminder_channels) !==
      JSON.stringify(state.savedValues.default_reminder_channels);

  return {
    ...state,
    isDirty,
    load,
    setValues,
    reset,
    save,
    clearToast,
  };
}
