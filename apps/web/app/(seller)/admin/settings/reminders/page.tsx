'use client';

import { Button } from '@hivork/ui';
import { Suspense, useEffect } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import {
  RemindersSettingsForm,
  RemindersSettingsFormSkeleton,
} from '@/components/settings/reminders-settings-form';
import { useRemindersSettings } from '@/hooks/use-reminders-settings';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { REMINDERS_SETTINGS_PERMISSION } from '@/lib/settings/reminders-settings.schema';

export default function RemindersSettingsPage() {
  return (
    <RequirePermission permission={REMINDERS_SETTINGS_PERMISSION}>
      <Suspense fallback={<RemindersSettingsPageSkeleton />}>
        <RemindersSettingsContent />
      </Suspense>
    </RequirePermission>
  );
}

function RemindersSettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <RemindersSettingsFormSkeleton />
    </div>
  );
}

function BranchOverrideInfoBanner() {
  return (
    <div
      className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
      role="status"
    >
      <p className="font-medium">تنظیمات یادآور در سطح tenant اعمال می‌شود.</p>
      <p className="mt-1 text-sky-800">
        override شعبه‌ای در نسخه‌های بعدی اضافه می‌شود — در Phase 1 فقط tenant-level پشتیبانی
        می‌شود.
      </p>
    </div>
  );
}

function RemindersSettingsContent() {
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
  } = useRemindersSettings();

  useUnsavedWarning(isDirty);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5_000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader />
        <NoPermissionPage required={REMINDERS_SETTINGS_PERMISSION} />
        <p className="text-center text-sm text-neutral-600">
          برای دسترسی به این بخش با مدیر فروشگاه تماس بگیرید.
        </p>
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

      <BranchOverrideInfoBanner />

      {moduleDisabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ماژول اقساط برای فروشگاه شما فعال نیست.
        </div>
      ) : null}

      {loading ? (
        <RemindersSettingsFormSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری تنظیمات</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={() => void load()}>
            تلاش مجدد
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
          <RemindersSettingsForm
            values={values}
            fieldErrors={fieldErrors}
            disabled={moduleDisabled}
            saving={saving}
            isDirty={isDirty}
            onChange={setValues}
            onSubmit={() => void save()}
            onReset={reset}
          />
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">تنظیمات یادآور</h1>
      <p className="text-sm text-neutral-600">
        زمان‌بندی و کانال‌های ارسال یادآور اقساط را برای تمام شعبه‌های فروشگاه تنظیم کنید.
      </p>
    </div>
  );
}
