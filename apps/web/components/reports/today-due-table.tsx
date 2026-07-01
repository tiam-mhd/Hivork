'use client';

import type { InstallmentSummaryDto } from '@hivork/contracts/installments';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { maskPhone } from '@/lib/auth/phone-utils';
import { formatIsoDateAsJalali } from '@/lib/i18n';
import { getInstallmentStatusPresentation } from '@/lib/sales/installment-status';

type TodayDueTableProps = {
  items: InstallmentSummaryDto[];
};

function formatSaleRef(saleId: string): string {
  return `#${saleId.slice(-4).toUpperCase()}`;
}

function formatCustomerName(name: string | null, phone: string): string {
  if (name?.trim()) {
    return name.trim();
  }
  return maskPhone(phone);
}

function formatDueDate(dueDate: string): string {
  return formatIsoDateAsJalali(dueDate.slice(0, 10));
}

function InstallmentStatusCell({ status }: { status: InstallmentSummaryDto['status'] }) {
  const { label, className, emoji } = getInstallmentStatusPresentation(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

export function TodayDueTableSkeleton() {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="در حال بارگذاری سررسید امروز">
      <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
    </div>
  );
}

export function TodayDueReportTable({ items }: TodayDueTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-start text-neutral-600">
            <th className="px-2 py-2 font-medium">مشتری</th>
            <th className="px-2 py-2 font-medium">فروش</th>
            <th className="px-2 py-2 font-medium">قسط</th>
            <th className="px-2 py-2 font-medium">مبلغ</th>
            <th className="px-2 py-2 font-medium">وضعیت</th>
            <th className="px-2 py-2 font-medium">سررسید</th>
            <th className="px-2 py-2 font-medium">
              <span className="sr-only">عملیات</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
            >
              <td className="px-2 py-2">
                <div className="font-medium text-neutral-900">
                  {formatCustomerName(item.customer.name, item.customer.phone)}
                </div>
                {item.customer.name?.trim() ? (
                  <div className="font-mono text-xs text-neutral-600" dir="ltr">
                    {maskPhone(item.customer.phone)}
                  </div>
                ) : null}
              </td>
              <td className="px-2 py-2">
                <Link
                  href={`/admin/sales/${item.saleId}`}
                  className="text-neutral-700 hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {formatSaleRef(item.saleId)}
                </Link>
              </td>
              <td className="px-2 py-2 text-neutral-700">
                {formatPersianDigits(item.sequenceNumber)}
              </td>
              <td className="px-2 py-2 text-neutral-900">
                {formatToman(BigInt(item.amountRial))}
              </td>
              <td className="px-2 py-2">
                <InstallmentStatusCell status={item.status} />
              </td>
              <td className="px-2 py-2 text-neutral-700">{formatDueDate(item.dueDate)}</td>
              <td className="px-2 py-2 text-end">
                <button
                  type="button"
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  aria-label={`مشاهده فروش ${formatSaleRef(item.saleId)}`}
                  onClick={() => router.push(`/admin/sales/${item.saleId}`)}
                >
                  →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
