'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import { Suspense } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { OverdueFilters } from '@/components/reports/overdue-filters';
import { OverdueTable, OverdueTableSkeleton } from '@/components/reports/overdue-table';
import { useOverdueReport } from '@/hooks/use-overdue-report';

export default function OverdueReportPage() {
  return (
    <RequirePermission permission="installments.report.overdue">
      <Suspense fallback={<OverdueReportPageSkeleton />}>
        <OverdueReportContent />
      </Suspense>
    </RequirePermission>
  );
}

function OverdueReportPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
      <OverdueTableSkeleton />
    </div>
  );
}

function OverdueEmptyState({
  variant,
  onClearFilters,
}: {
  variant: 'no-results' | 'no-overdue';
  onClearFilters?: () => void;
}) {
  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white p-12 text-center">
        <p className="text-lg font-medium text-neutral-900">نتیجه‌ای یافت نشد</p>
        <p className="text-sm text-neutral-600">با فیلترهای فعلی مشتری معوقی وجود ندارد.</p>
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
      <p className="text-3xl" aria-hidden>
        🎉
      </p>
      <p className="text-lg font-medium text-neutral-900">معوقاتی ثبت نشده است</p>
      <p className="text-sm text-neutral-600">همه مشتریان به‌موقع پرداخت کرده‌اند.</p>
    </div>
  );
}

function OverdueReportContent() {
  const {
    filters,
    setFilters,
    clearFilters,
    items,
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
  } = useOverdueReport();

  if (forbidden) {
    return <NoPermissionPage required="installments.report.overdue" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">گزارش معوقات</h1>
        <Button
          type="button"
          variant="outline"
          disabled
          title="خروجی Excel در نسخه بعدی فعال می‌شود"
        >
          خروجی Excel
        </Button>
      </div>

      <OverdueFilters
        value={filters}
        branches={branches}
        onChange={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        disabled={loading}
      />

      {loading ? (
        <OverdueTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <OverdueEmptyState
          variant={emptyVariant}
          onClearFilters={emptyVariant === 'no-results' ? clearFilters : undefined}
        />
      ) : (
        <>
          <OverdueTable items={items} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              نمایش {formatPersianDigits(displayedCount)}
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
