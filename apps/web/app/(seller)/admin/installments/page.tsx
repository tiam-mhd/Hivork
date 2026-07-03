'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { Suspense } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import {
  InstallmentsDataTable,
  InstallmentsDataTableSkeleton,
} from '@/components/installments/installments-data-table';
import { InstallmentsFilters } from '@/components/installments/installments-filters';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useInstallmentsList } from '@/hooks/use-installments-list';

export default function InstallmentsListPage() {
  return (
    <RequirePermission permission="installments.installment.view">
      <Suspense fallback={<InstallmentsListPageSkeleton />}>
        <InstallmentsListContent />
      </Suspense>
    </RequirePermission>
  );
}

function InstallmentsListPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <InstallmentsDataTableSkeleton />
    </div>
  );
}

function InstallmentsListContent() {
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
    hasActiveFilters,
    branches,
  } = useInstallmentsList();

  if (forbidden) {
    return <NoPermissionPage required="installments.installment.view" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">اقساط</h1>
        <Button asChild variant="outline">
          <Link href="/admin/sales">مشاهده قراردادها</Link>
        </Button>
      </div>

      <InstallmentsFilters
        value={filters}
        branches={branches}
        onChange={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        disabled={loading}
      />

      {loading ? (
        <InstallmentsDataTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری اقساط</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button type="button" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-lg font-medium">قسطی یافت نشد</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'با فیلترهای فعلی نتیجه‌ای وجود ندارد.'
              : 'هنوز قسطی ثبت نشده است.'}
          </p>
          {hasActiveFilters ? (
            <Button type="button" variant="outline" onClick={clearFilters}>
              پاک کردن فیلتر
            </Button>
          ) : (
            <Button asChild>
              <Link href="/admin/sales">مشاهده قراردادها</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <InstallmentsDataTable items={items} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              نمایش {formatPersianDigits(items.length)}
              {meta?.total !== undefined ? ` از ${formatPersianDigits(meta.total)}` : ''}
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
