'use client';

import type { ThemeModePreference } from '@hivork/contracts/theme';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { BreadcrumbOverrideProvider } from '@/components/layout/breadcrumb-override';
import { MobileNavDrawer } from '@/components/layout/mobile-nav-drawer';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useRealtime } from '@/components/providers/realtime-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { useActiveBranch } from '@/hooks/use-active-branch';
import { useStaffAuth } from '@/lib/auth/use-staff-auth';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import { ADMIN_SHELL_VERSION } from '@/lib/navigation/admin-menu';

function AdminShellSkeleton() {
  return (
    <div className="layout-shell flex">
      <aside className="layout-sidebar-panel hidden border-e border-sidebar-border bg-sidebar lg:block">
        <div className="space-y-3 p-4">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-secondary" />
          <div className="h-10 animate-pulse rounded bg-secondary" />
          <div className="h-10 animate-pulse rounded bg-secondary" />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="layout-header border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="ms-auto h-10 w-28 animate-pulse rounded bg-secondary" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
          </div>
        </div>
        <div className="layout-main">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-40 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    </div>
  );
}

type AdminShellProps = {
  children: ReactNode;
  initialThemeId: string;
  initialThemeMode: ThemeModePreference;
};

export function AdminShell({ children, initialThemeId, initialThemeMode }: AdminShellProps) {
  const router = useRouter();
  const { isLoading, error, staff, tenant, refetch } = useAdminSession();
  const { logout } = useStaffAuth();
  const {
    branches,
    activeBranchId,
    activeBranch,
    isSwitching,
    toast,
    clearToast,
    switchBranch,
  } = useActiveBranch();
  const { highPriorityToast, clearHighPriorityToast } = useRealtime();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [logout, router]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider themeId={initialThemeId} defaultTheme={initialThemeMode}>
        <AdminShellSkeleton />
      </ThemeProvider>
    );
  }

  if (error || !staff || !tenant) {
    return (
      <ThemeProvider themeId={initialThemeId} defaultTheme={initialThemeMode}>
        <main className="layout-shell flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>خطا در بارگذاری پنل</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-destructive">{error ?? 'اطلاعات کاربر در دسترس نیست.'}</p>
              <div className="flex gap-2">
                <Button type="button" onClick={() => void refetch()}>
                  تلاش مجدد
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleLogout()}>
                  خروج
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      themeId={initialThemeId}
      defaultTheme={initialThemeMode}
      tenantThemeId={tenant.settings?.themeId}
    >
      <div className="layout-shell flex">
        <aside className="layout-sidebar-panel hidden shrink-0 lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <AdminSidebar className="layout-glass-panel flex-1" />
            <div className="layout-glass-footer border-e border-t border-footer-border px-4 py-3 text-xs text-footer-foreground">
              {ADMIN_SHELL_VERSION}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader
            tenant={tenant}
            staffName={staff.name}
            branchSwitcher={{
              branches,
              activeBranchId,
              activeBranchName: activeBranch?.name ?? null,
              loading: isSwitching,
              onChange: (branchId) => void switchBranch(branchId),
            }}
            onLogout={handleLogout}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />

          {toast ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 border-b border-banner-error-border bg-banner-error px-4 py-2 text-sm text-banner-error-foreground"
            >
              <span>{toast}</span>
              <button type="button" className="underline" onClick={clearToast}>
                بستن
              </button>
            </div>
          ) : null}

          {highPriorityToast ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 border-b border-banner-trial-border bg-banner-trial px-4 py-2 text-sm text-banner-trial-foreground"
            >
              <span>{highPriorityToast}</span>
              <button type="button" className="underline" onClick={clearHighPriorityToast}>
                بستن
              </button>
            </div>
          ) : null}

          <main className="layout-main flex-1">
            <BreadcrumbOverrideProvider>
              <PageBreadcrumb />
              {children}
            </BreadcrumbOverrideProvider>
          </main>
        </div>

        <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      </div>
    </ThemeProvider>
  );
}
