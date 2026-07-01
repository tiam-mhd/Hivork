'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { Suspense } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { SaleEmptyState } from '@/components/sales/sale-empty-state';
import { SaleListFilters } from '@/components/sales/sale-list-filters';
import { SaleTable, SaleTableSkeleton } from '@/components/sales/sale-table';
import { usePermission } from '@/hooks/use-permission';
import { useSalesList } from '@/hooks/use-sales-list';

export default function SalesListPage() {
  return (
    <RequirePermission permission="installments.sale.view">
      <Suspense fallback={<SalesListPageSkeleton />}>
        <SalesListContent />
      </Suspense>
    </RequirePermission>
  );
}

function SalesListPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      <SaleTableSkeleton />
    </div>
  );
}

function SalesListContent() {
  const canCreate = usePermission('installments.sale.create');

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
  } = useSalesList();

  if (forbidden) {
    return <NoPermissionPage required="installments.sale.view" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">فروش‌ها</h1>
          <p className="text-sm text-muted-foreground">مدیریت فروش‌های اقساطی و پیگیری وضعیت</p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0">
            <Link href="/admin/sales/new">＋ فروش جدید</Link>
          </Button>
        ) : null}
      </header>

      <SaleListFilters
        value={filters}
        branches={branches}
        onChange={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        disabled={loading}
      />

      {loading ? (
        <SaleTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <SaleEmptyState
          variant={emptyVariant}
          canCreate={canCreate}
          onClearFilters={emptyVariant === 'no-results' ? clearFilters : undefined}
        />
      ) : (
        <>
          <SaleTable items={items} branches={branches} />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              نمایش {formatPersianDigits(displayedCount)} فروش
            </p>
            {hasMore ? (
              <Button type="button" variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
