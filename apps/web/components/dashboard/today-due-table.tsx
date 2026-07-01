'use client';

import type { InstallmentSummaryDto } from '@hivork/contracts/installments';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@hivork/ui';
import Link from 'next/link';

type TodayDueTableProps = {
  items: InstallmentSummaryDto[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  canCreateSale?: boolean;
  viewAllHref?: string;
};

function formatSaleRef(saleId: string): string {
  return `#${saleId.slice(-4).toUpperCase()}`;
}

function formatCustomerName(name: string | null, phone: string): string {
  if (name?.trim()) {
    return name.trim();
  }
  return formatPersianDigits(phone);
}

function TodayDueTableSkeleton() {
  return (
    <div className="flex flex-col gap-0 divide-y divide-border" aria-busy="true" aria-label="در حال بارگذاری جدول سررسید امروز">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse bg-muted/20" />
      ))}
    </div>
  );
}

export function TodayDueTable({
  items,
  loading = false,
  error = null,
  onRetry,
  canCreateSale = false,
  viewAllHref = '/admin/reports/today-due',
}: TodayDueTableProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base font-semibold">قسط‌های سررسید امروز</CardTitle>
        {!loading && !error && items.length > 0 ? (
          <Link
            href={viewAllHref}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            مشاهده همه ←
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <TodayDueTableSkeleton />
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-destructive">{error}</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                تلاش مجدد
              </Button>
            ) : null}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">امروز قسطی سررسید ندارید 🎉</p>
            {canCreateSale ? (
              <Button asChild size="sm">
                <Link href="/admin/sales/new">＋ فروش جدید</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2.5">مشتری</th>
                  <th className="px-3 py-2.5">فروش</th>
                  <th className="px-3 py-2.5">قسط</th>
                  <th className="px-3 py-2.5">مبلغ</th>
                  <th className="px-3 py-2.5">
                    <span className="sr-only">عملیات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-border/60 last:border-0',
                      index % 2 === 1 && 'bg-muted/10',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/customers/${item.customer.id}/edit`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {formatCustomerName(item.customer.name, item.customer.phone)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/sales/${item.saleId}`}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {formatSaleRef(item.saleId)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                      {formatPersianDigits(item.sequenceNumber)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-foreground">
                      {formatToman(BigInt(item.amountRial))}
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <Link
                        href={`/admin/sales/${item.saleId}`}
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`مشاهده فروش ${formatSaleRef(item.saleId)}`}
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
