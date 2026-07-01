'use client';

import { Suspense } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { ChangePhoneWizard } from '@/components/settings/change-phone-wizard';
import { CHANGE_PHONE_PERMISSION } from '@/lib/auth/change-phone';

export default function ChangePhoneSettingsPage() {
  return (
    <RequirePermission permission={CHANGE_PHONE_PERMISSION} fallback={<NoPermissionPage required={CHANGE_PHONE_PERMISSION} />}>
      <Suspense fallback={<ChangePhonePageSkeleton />}>
        <ChangePhonePageContent />
      </Suspense>
    </RequirePermission>
  );
}

function ChangePhonePageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <div className="h-40 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

function ChangePhonePageContent() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">تغییر شماره موبایل</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          شماره ورود حساب کاربری شما در تمام tenantها به‌روزرسانی می‌شود.
        </p>
      </div>
      <ChangePhoneWizard />
    </div>
  );
}
