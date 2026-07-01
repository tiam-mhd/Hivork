'use client';


import type { TenantCustomerDetailResponseDto } from '@hivork/contracts/customers';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';
import type { ReactNode } from 'react';

import { formatIsoDateAsJalali } from '@/lib/i18n';

type CustomerStatsPanelProps = {
  stats: Pick<
    TenantCustomerDetailResponseDto,
    'creditScore' | 'overdueCount' | 'totalPurchaseRial' | 'lastPurchaseAt'
  >;
};

function formatLastPurchase(lastPurchaseAt: string | null): string {
  if (!lastPurchaseAt) {
    return '—';
  }
  return formatIsoDateAsJalali(lastPurchaseAt.slice(0, 10));
}

function StatItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{children}</dd>
    </div>
  );
}

export function CustomerStatsPanel({ stats }: CustomerStatsPanelProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">آمار مشتری</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <StatItem label="امتیاز اعتباری">{formatPersianDigits(stats.creditScore)}</StatItem>
          <StatItem label="تعداد معوقات">{formatPersianDigits(stats.overdueCount)}</StatItem>
          <StatItem label="مجموع خرید">{formatToman(BigInt(stats.totalPurchaseRial))}</StatItem>
          <StatItem label="آخرین خرید">{formatLastPurchase(stats.lastPurchaseAt)}</StatItem>
        </dl>
      </CardContent>
    </Card>
  );
}
