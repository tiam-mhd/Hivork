'use client';

import { formatPersianDigits, formatToman, LOCALE } from '@hivork/i18n';
import { Button } from '@hivork/ui';

import { RequirePermission } from '@/components/auth/require-permission';
import { CollectionsChart } from '@/components/dashboard/collections-chart';
import { KpiCard, KpiGridSkeleton } from '@/components/dashboard/kpi-card';
import { NewIpAlert } from '@/components/dashboard/new-ip-alert';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { TodayDueTable } from '@/components/dashboard/today-due-table';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useActiveBranch } from '@/hooks/use-active-branch';
import { useDashboard } from '@/hooks/use-dashboard';
import { usePermission } from '@/hooks/use-permission';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import { buildTodayDueViewAllHref } from '@/lib/reports/today-due-report.utils';

function formatLastUpdated(date: Date | null): string {
  if (!date) {
    return '—';
  }
  const formatted = new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return formatPersianDigits(formatted);
}

export default function SellerDashboardPage() {
  return (
    <RequirePermission permission="installments.report.dashboard">
      <SellerDashboardContent />
    </RequirePermission>
  );
}

function SellerDashboardContent() {
  const { tenant } = useAdminSession();
  const { activeBranch } = useActiveBranch();
  const canCreateSale = usePermission('installments.sale.create');
  const {
    dashboard,
    todayDue,
    cashflow,
    dashboardLoading,
    todayDueLoading,
    cashflowLoading,
    dashboardError,
    todayDueError,
    cashflowError,
    forbidden,
    lastFetchedAt,
    refresh,
    retryDashboard,
    retryTodayDue,
    isRefreshing,
  } = useDashboard();

  if (forbidden) {
    return <NoPermissionPage required="installments.report.dashboard" />;
  }

  const branchLabel = activeBranch?.name ?? 'همه شعبه‌ها';

  const showFullPageError = dashboardError && !dashboard && !dashboardLoading;

  if (showFullPageError) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-foreground">داشبورد</h1>
        <p className="text-sm text-destructive">خطا در بارگذاری</p>
        <p className="text-sm text-muted-foreground">{dashboardError}</p>
        <Button type="button" onClick={retryDashboard}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const kpi = dashboard?.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">داشبورد</h1>
          <p className="text-sm text-muted-foreground">
            {tenant?.name ?? '—'} — {branchLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>آخرین به‌روزرسانی: {formatLastUpdated(lastFetchedAt)}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="به‌روزرسانی داشبورد"
          >
            ↻
          </Button>
        </div>
      </div>

      <NewIpAlert />

      {dashboardLoading && !kpi ? (
        <KpiGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="قسط‌های سررسید امروز"
            value={formatPersianDigits(kpi?.todayDueCount ?? 0)}
            loading={dashboardLoading}
          />
          <KpiCard
            label="معوقات"
            value={formatPersianDigits(kpi?.overdueCount ?? 0)}
            loading={dashboardLoading}
            href="/admin/reports/overdue"
          />
          <KpiCard
            label="دریافتی این ماه"
            value={formatToman(BigInt(kpi?.thisMonthCollectedRial ?? '0'))}
            loading={dashboardLoading}
          />
          <KpiCard
            label="فروش‌های فعال"
            value={formatPersianDigits(kpi?.activeSalesCount ?? 0)}
            loading={dashboardLoading}
          />
        </div>
      )}

      <QuickActions />

      <TodayDueTable
        items={todayDue?.data ?? []}
        loading={todayDueLoading}
        error={todayDueError}
        onRetry={retryTodayDue}
        canCreateSale={canCreateSale}
        viewAllHref={buildTodayDueViewAllHref(activeBranch?.id)}
      />

      <CollectionsChart
        data={cashflow}
        loading={cashflowLoading}
        error={cashflowError}
      />
    </div>
  );
}
