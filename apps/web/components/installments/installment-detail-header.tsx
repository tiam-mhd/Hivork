'use client';

import { formatPersianDigits, formatToman } from '@hivork/i18n';
import Link from 'next/link';

import { InstallmentStatusBadge } from '@/components/sales/installment-status-badge';
import type { InstallmentDetailView } from '@/hooks/use-installment-detail';
import { formatIsoDateAsJalali } from '@/lib/i18n';

type InstallmentDetailHeaderProps = {
  detail: InstallmentDetailView;
};

export function InstallmentDetailHeader({ detail }: InstallmentDetailHeaderProps) {
  const { installment, sale } = detail;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            قسط {formatPersianDigits(installment.sequenceNumber)}
          </h1>
          <InstallmentStatusBadge installment={installment} saleStatus={sale.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          سررسید: {formatIsoDateAsJalali(installment.dueDate.slice(0, 10))}
        </p>
        <p className="text-lg font-semibold tabular-nums">
          {formatToman(BigInt(installment.amountRial))}
        </p>
        {sale.customer ? (
          <p className="text-sm">
            مشتری:{' '}
            <Link href={`/admin/customers/${sale.tenantCustomerId}`} className="text-primary hover:underline">
              {sale.customer.name ?? sale.customer.phone}
            </Link>
          </p>
        ) : null}
        <p className="text-sm">
          قرارداد:{' '}
          <Link href={`/admin/sales/${sale.id}`} className="text-primary hover:underline">
            {sale.title ?? 'مشاهده قرارداد'}
          </Link>
        </p>
      </div>
    </div>
  );
}
