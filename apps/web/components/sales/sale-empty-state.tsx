'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';

type SaleEmptyStateProps = {
  variant: 'no-sales' | 'no-results';
  canCreate?: boolean;
  onClearFilters?: () => void;
};

export function SaleEmptyState({
  variant,
  canCreate = false,
  onClearFilters,
}: SaleEmptyStateProps) {
  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
        <p className="font-medium text-foreground">نتیجه‌ای یافت نشد</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          فیلترها را تغییر دهید یا بازهٔ تاریخ را گسترده‌تر کنید.
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
        🧾
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="font-medium text-foreground">هنوز فروشی ثبت نشده است</p>
        <p className="text-sm text-muted-foreground">
          با ثبت اولین فروش، اقساط به‌صورت خودکار ایجاد می‌شوند.
        </p>
      </div>
      {canCreate ? (
        <Button asChild>
          <Link href="/admin/sales/new">＋ فروش جدید</Link>
        </Button>
      ) : null}
    </div>
  );
}
