'use client';

import type { SaleDetailDto } from '@hivork/contracts/installments';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { cn } from '@hivork/ui';

import { InstallmentStatusBadge } from '@/components/sales/installment-status-badge';
import { formatIsoDateAsJalali } from '@/lib/i18n';

type InstallmentTableProps = {
  sale: SaleDetailDto;
};

function formatDueDate(dueDate: string): string {
  return formatIsoDateAsJalali(dueDate.slice(0, 10));
}

export function InstallmentTable({ sale }: InstallmentTableProps) {
  const installments = [...sale.installments].sort(
    (left, right) => left.sequenceNumber - right.sequenceNumber,
  );

  if (installments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 py-10 text-center text-sm text-muted-foreground">
        قسطی برای این فروش ثبت نشده است.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">قسط</th>
              <th className="px-4 py-3">مبلغ</th>
              <th className="px-4 py-3">سررسید</th>
              <th className="px-4 py-3">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((installment, index) => (
              <tr
                key={installment.id}
                className={cn(
                  'border-b border-border/60 last:border-0',
                  index % 2 === 1 && 'bg-muted/10',
                )}
              >
                <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                  {formatPersianDigits(installment.sequenceNumber)}
                </td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {formatToman(BigInt(installment.amountRial))}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDueDate(installment.dueDate)}</td>
                <td className="px-4 py-3">
                  <InstallmentStatusBadge installment={installment} saleStatus={sale.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InstallmentTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy="true"
      aria-label="در حال بارگذاری اقساط"
    >
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
