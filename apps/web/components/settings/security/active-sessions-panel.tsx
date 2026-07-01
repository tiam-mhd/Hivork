'use client';

import { useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { LastLoginCard } from '@/components/settings/security/last-login-card';
import { SecurityAuditLog } from '@/components/settings/security/security-audit-log';
import { SessionList } from '@/components/settings/security/session-list';
import { STAFF_SESSION_VIEW_PERMISSION } from '@/components/settings/security/sessions-card';

export function ActiveSessionsPanel() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <RequirePermission
      permission={STAFF_SESSION_VIEW_PERMISSION}
      fallback={<NoPermissionPage required={STAFF_SESSION_VIEW_PERMISSION} />}
    >
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">نشست‌ها و دستگاه‌های فعال</h1>
          <p className="text-sm text-muted-foreground">
            مدیریت دستگاه‌های متصل و مشاهده رویدادهای امنیتی حساب کاربری.
          </p>
        </header>

        {toast ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {toast}
          </div>
        ) : null}

        <LastLoginCard />
        <SessionList onToast={setToast} />
        <SecurityAuditLog />
      </div>
    </RequirePermission>
  );
}
