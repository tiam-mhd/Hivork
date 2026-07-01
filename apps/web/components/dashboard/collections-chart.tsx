'use client';

import type { CashflowReportResponseDto } from '@hivork/contracts/reports';
import { formatPersianDigits, formatToman, LOCALE } from '@hivork/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';

type CollectionsChartProps = {
  data: CashflowReportResponseDto | null;
  loading?: boolean;
  error?: string | null;
};

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) {
    return monthKey;
  }
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit' }).format(date);
}

export function CollectionsChart({ data, loading = false, error = null }: CollectionsChartProps) {
  const buckets = data?.data.buckets ?? [];
  const maxRial = buckets.reduce((max, bucket) => {
    const value = BigInt(bucket.totalRial);
    return value > max ? value : max;
  }, 0n);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">نمودار وصولی ۶ ماه آینده</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-end gap-2" aria-busy="true" aria-label="در حال بارگذاری نمودار">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex-1 animate-pulse rounded-t-md bg-muted"
                style={{ height: `${30 + index * 8}%` }}
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : buckets.length === 0 ? (
          <p className="text-sm text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</p>
        ) : (
          <div className="flex h-48 items-end gap-2" role="img" aria-label="نمودار میله‌ای وصولی ماهانه">
            {buckets.map((bucket) => {
              const rial = BigInt(bucket.totalRial);
              const heightPercent = maxRial > 0n ? Number((rial * 100n) / maxRial) : 0;
              const minHeight = rial > 0n ? 8 : 2;

              return (
                <div key={bucket.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-xs tabular-nums text-muted-foreground" title={formatToman(rial)}>
                    {rial > 0n ? formatPersianDigits(bucket.installmentCount) : '۰'}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all"
                    style={{ height: `${Math.max(minHeight, heightPercent)}%` }}
                  />
                  <span className="truncate text-xs text-muted-foreground">{formatMonthLabel(bucket.month)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
