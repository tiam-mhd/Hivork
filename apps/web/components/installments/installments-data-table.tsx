'use client';

import type { InstallmentSummaryDto } from '@hivork/contracts/installments';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import Link from 'next/link';

import { InstallmentStatusBadge } from '@/components/sales/installment-status-badge';
import { formatIsoDateAsJalali } from '@/lib/i18n';

type InstallmentsDataTableProps = {
  items: InstallmentSummaryDto[];
  saleStatus?: 'active' | 'completed' | 'cancelled';
};

function installmentHref(item: InstallmentSummaryDto): string {
  return `/admin/installments/${item.id}?saleId=${item.saleId}`;
}

export function InstallmentsDataTable({ items, saleStatus = 'active' }: InstallmentsDataTableProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">قسط</th>
              <th className="px-4 py-3">مشتری</th>
              <th className="px-4 py-3">مبلغ</th>
              <th className="px-4 py-3">سررسید</th>
              <th className="px-4 py-3">وضعیت</th>
              <th className="px-4 py-3">قرارداد</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={`border-b border-border/60 last:border-0 ${index % 2 === 1 ? 'bg-muted/10' : ''}`}
              >
                <td className="px-4 py-3 font-medium tabular-nums">
                  <Link href={installmentHref(item)} className="text-primary hover:underline">
                    {formatPersianDigits(item.sequenceNumber)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{item.customer.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{item.customer.phone}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatToman(BigInt(item.amountRial))}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatIsoDateAsJalali(item.dueDate.slice(0, 10))}
                </td>
                <td className="px-4 py-3">
                  <InstallmentStatusBadge
                    installment={{
                      id: item.id,
                      sequenceNumber: item.sequenceNumber,
                      dueDate: item.dueDate,
                      amountRial: item.amountRial,
                      status: item.status,
                    }}
                    saleStatus={saleStatus}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/sales/${item.saleId}`} className="text-primary hover:underline">
                    مشاهده قرارداد
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InstallmentsDataTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy="true"
      aria-label="در حال بارگذاری اقساط"
    >
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
