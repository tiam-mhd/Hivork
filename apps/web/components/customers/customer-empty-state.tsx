'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';

type CustomerEmptyStateProps = {
  variant: 'no-customers' | 'no-results';
  canCreate?: boolean;
  onClearFilters?: () => void;
};

export function CustomerEmptyState({
  variant,
  canCreate = false,
  onClearFilters,
}: CustomerEmptyStateProps) {
  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
        <p className="font-medium text-foreground">نتیجه‌ای یافت نشد</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          فیلترها را تغییر دهید یا جستجو را پاک کنید.
        </p>
        {onClearFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
            پاک کردن فیلتر
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl"
        aria-hidden
      >
        👥
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="font-medium text-foreground">هنوز مشتری ثبت نکرده‌اید</p>
        <p className="text-sm text-muted-foreground">اولین مشتری خود را اضافه کنید.</p>
      </div>
      {canCreate ? (
        <Button asChild>
          <Link href="/admin/customers/new">＋ مشتری جدید</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function CustomerTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy="true"
      aria-label="در حال بارگذاری لیست مشتریان"
    >
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
