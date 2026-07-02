'use client';

import { Button } from '@hivork/ui';
import { Suspense, useEffect } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import {
  InstallmentsSettingsForm,
  InstallmentsSettingsFormSkeleton,
} from '@/components/settings/installments-settings-form';
import { useInstallmentsSettings } from '@/hooks/use-installments-settings';
import { usePermission } from '@/hooks/use-permission';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import {
  INSTALLMENTS_SETTINGS_EDIT_PERMISSION,
  INSTALLMENTS_SETTINGS_VIEW_PERMISSION,
} from '@/lib/settings/installments-settings';

export default function InstallmentsSettingsPage() {
  return (
    <RequirePermission permission={INSTALLMENTS_SETTINGS_VIEW_PERMISSION}>
      <Suspense fallback={<InstallmentsSettingsPageSkeleton />}>
        <InstallmentsSettingsContent />
      </Suspense>
    </RequirePermission>
  );
}

function InstallmentsSettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <InstallmentsSettingsFormSkeleton />
    </div>
  );
}

function InstallmentsSettingsContent() {
  const canEdit = usePermission(INSTALLMENTS_SETTINGS_EDIT_PERMISSION);
  const {
    values,
    loading,
    saving,
    error,
    forbidden,
    moduleDisabled,
    tenantSuspended,
    versionConflict,
    toast,
    fieldErrors,
    isDirty,
    load,
    setValues,
    reset,
    save,
    clearToast,
  } = useInstallmentsSettings();

  useUnsavedWarning(isDirty && canEdit);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader />
        <NoPermissionPage required={INSTALLMENTS_SETTINGS_VIEW_PERMISSION} />
      </div>
    );
  }

  if (tenantSuspended) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader />
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-medium text-red-800">حساب فروشگاه معلق است</p>
          <p className="mt-2 text-sm text-red-700">در این وضعیت امکان ویرایش تنظیمات وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader />

      {toast ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            versionConflict
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          شما فقط دسترسی مشاهده دارید. برای ویرایش، مجوز `{INSTALLMENTS_SETTINGS_EDIT_PERMISSION}`
          لازم است.
        </div>
      ) : null}

      {moduleDisabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ماژول اقساط برای فروشگاه شما فعال نیست.
        </div>
      ) : null}

      {loading ? (
        <InstallmentsSettingsFormSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری تنظیمات اقساط</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={() => void load()}>
            تلاش مجدد
          </Button>
        </div>
      ) : (
        <InstallmentsSettingsForm
          values={values}
          fieldErrors={fieldErrors}
          disabled={moduleDisabled}
          saving={saving}
          isDirty={isDirty}
          canEdit={canEdit}
          onChange={setValues}
          onSubmit={() => void save()}
          onReset={reset}
        />
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">تنظیمات اقساط</h1>
      <p className="text-sm text-neutral-600">
        فرمول، جریمه، سود، گرد کردن، تعطیلات، تقویم و شماره‌گذاری قراردادهای اقساطی را
        مدیریت کنید.
      </p>
    </div>
  );
}
