'use client';

import type { OverdueReportRowDto } from '@hivork/contracts/reports';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { useRouter } from 'next/navigation';

import { maskPhone } from '@/lib/auth/phone-utils';
import { formatIsoDateAsJalali } from '@/lib/i18n';

type OverdueTableProps = {
  items: OverdueReportRowDto[];
};

function formatCustomerName(name: string | null): string {
  return name?.trim() ? name.trim() : '—';
}

function formatJalaliDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return formatIsoDateAsJalali(iso.slice(0, 10));
}

function BotLinkedBadge({ linked }: { linked: boolean }) {
  if (linked) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <span aria-hidden>✅</span>
        <span>متصل</span>
      </span>
    );
  }

  return <span className="text-neutral-500">متصل نیست</span>;
}

export function OverdueTableSkeleton() {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="در حال بارگذاری گزارش معوقات">
      <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
    </div>
  );
}

export function OverdueTable({ items }: OverdueTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-start text-neutral-600">
            <th className="px-2 py-2 font-medium">مشتری</th>
            <th className="px-2 py-2 font-medium">تعداد معوق</th>
            <th className="px-2 py-2 font-medium">مجموع معوق</th>
            <th className="px-2 py-2 font-medium">قدیمی‌ترین سررسید</th>
            <th className="px-2 py-2 font-medium">آخرین پرداخت</th>
            <th className="px-2 py-2 font-medium">ربات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.customerId}
              className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
              onClick={() => router.push(`/admin/customers/${item.customerId}/edit`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  router.push(`/admin/customers/${item.customerId}/edit`);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`ویرایش مشتری ${formatCustomerName(item.displayName)}`}
            >
              <td className="px-2 py-2">
                <div className="font-medium text-neutral-900">
                  {formatCustomerName(item.displayName)}
                </div>
                <div className="font-mono text-xs text-neutral-600" dir="ltr">
                  {maskPhone(item.phone)}
                </div>
              </td>
              <td className="px-2 py-2 text-neutral-900">
                {formatPersianDigits(item.overdueCount)}
              </td>
              <td className="px-2 py-2 text-neutral-900">
                {formatToman(BigInt(item.totalOverdueRial))}
              </td>
              <td className="px-2 py-2 text-neutral-700">
                {formatJalaliDate(item.oldestDueDate)}
              </td>
              <td className="px-2 py-2 text-neutral-700">
                {formatJalaliDate(item.lastPaymentAt)}
              </td>
              <td className="px-2 py-2">
                <BotLinkedBadge linked={item.botLinked} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
