'use client';

import type { TodayDueReportMetaDto } from '@hivork/contracts/reports';
import { formatPersianDigits, formatToman } from '@hivork/i18n';

import { formatIsoDateAsJalali } from '@/lib/i18n';

type TodayDueSummaryProps = {
  meta: TodayDueReportMetaDto | null;
  loading?: boolean;
};

function getTehranTodayIsoDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function TodayDueSummary({ meta, loading = false }: TodayDueSummaryProps) {
  const jalaliToday = formatIsoDateAsJalali(getTehranTodayIsoDate());

  if (loading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-5 w-64 animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  const count = meta?.total ?? 0;
  const totalRial = meta?.totalAmountRial ?? '0';

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-600">امروز — {jalaliToday}</p>
      <p className="text-base font-medium text-neutral-900">
        {formatPersianDigits(count)} قسط سررسید — مجموع:{' '}
        {formatToman(BigInt(totalRial))}
      </p>
    </div>
  );
}
