'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { Suspense } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { TodayDueFilters } from '@/components/reports/today-due-filters';
import { TodayDueSummary } from '@/components/reports/today-due-summary';
import { TodayDueReportTable, TodayDueTableSkeleton } from '@/components/reports/today-due-table';
import { usePermission } from '@/hooks/use-permission';
import { useTodayDueReport } from '@/hooks/use-today-due-report';

export default function TodayDueReportPage() {
  return (
    <RequirePermission permission="installments.report.dashboard">
      <Suspense fallback={<TodayDueReportPageSkeleton />}>
        <TodayDueReportContent />
      </Suspense>
    </RequirePermission>
  );
}

function TodayDueReportPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
      <TodayDueTableSkeleton />
    </div>
  );
}

function TodayDueEmptyState({
  variant,
  canCreateSale,
  onClearFilters,
}: {
  variant: 'no-results' | 'no-dues';
  canCreateSale: boolean;
  onClearFilters?: () => void;
}) {
  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white p-12 text-center">
        <p className="text-lg font-medium text-neutral-900">نتیجه‌ای یافت نشد</p>
        <p className="text-sm text-neutral-600">با فیلترهای فعلی قسطی سررسید امروز وجود ندارد.</p>
        {onClearFilters ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            پاک کردن فیلتر
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white p-12 text-center">
      <p className="text-lg font-medium text-neutral-900">امروز قسطی سررسید ندارید 🎉</p>
      <p className="text-sm text-neutral-600">می‌توانید فروش جدید ثبت کنید.</p>
      {canCreateSale ? (
        <Button asChild>
          <Link href="/admin/sales/new">＋ فروش جدید</Link>
        </Button>
      ) : null}
    </div>
  );
}

function TodayDueReportContent() {
  const canCreateSale = usePermission('installments.sale.create');

  const {
    filters,
    setFilters,
    clearFilters,
    items,
    meta,
    hasMore,
    loading,
    loadingMore,
    error,
    forbidden,
    retry,
    loadMore,
    isEmpty,
    emptyVariant,
    hasActiveFilters,
    displayedCount,
    branches,
  } = useTodayDueReport();

  if (forbidden) {
    return <NoPermissionPage required="installments.report.dashboard" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">سررسید امروز</h1>

      <TodayDueSummary meta={meta} loading={loading} />

      <TodayDueFilters
        value={filters}
        branches={branches}
        onChange={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        disabled={loading}
      />

      {loading ? (
        <TodayDueTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <TodayDueEmptyState
          variant={emptyVariant}
          canCreateSale={canCreateSale}
          onClearFilters={emptyVariant === 'no-results' ? clearFilters : undefined}
        />
      ) : (
        <>
          <TodayDueReportTable items={items} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              نمایش {formatPersianDigits(displayedCount)}
              {meta ? ` از ${formatPersianDigits(meta.total)}` : ''}
            </p>
            {hasMore ? (
              <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'در حال بارگذاری...' : 'بارگذاری بیشتر →'}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
