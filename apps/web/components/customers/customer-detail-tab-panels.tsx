'use client';

import type {
  CustomerContractListItemDto,
  CustomerPaymentListItemDto,
  CustomerTimelineEventTypeDto,
} from '@hivork/contracts/customers';
import { formatIsoDateAsJalali, formatPersianDigits } from '@hivork/i18n';
import { Button, Card, CardContent } from '@hivork/ui';

import {
  useCustomerContracts,
  useCustomerPayments,
  useCustomerTimeline,
} from '@/lib/api/customers';

const TYPE_LABELS: Record<CustomerTimelineEventTypeDto, string> = {
  payment: 'پرداخت',
  contract: 'قرارداد',
  sms: 'پیامک',
  notification: 'اعلان',
  note: 'یادداشت',
  call: 'تماس',
  audit: 'سوابق',
};

type CustomerTimelineTabProps = {
  customerId: string;
  active: boolean;
};

export function CustomerTimelineTab({ customerId, active }: CustomerTimelineTabProps) {
  const { items, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useCustomerTimeline(customerId, active);

  if (isLoading) {
    return <TabLoadingSkeleton />;
  }

  if (isError) {
    return (
      <TabErrorState
        message={error instanceof Error ? error.message : 'بارگذاری خط زمانی ناموفق بود.'}
        onRetry={() => void refetch()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          رویدادی ثبت نشده است.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="relative flex flex-col gap-4 border-r border-border pr-4">
        {items.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -right-[1.35rem] top-1.5 size-2.5 rounded-full bg-primary" />
            <div className="rounded-xl border border-border/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[event.type]} ·{' '}
                    {formatIsoDateAsJalali(event.occurredAt.slice(0, 10))}{' '}
                    {formatPersianDigits(
                      new Date(event.occurredAt).toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    )}
                  </p>
                </div>
                {event.actor?.name ? (
                  <span className="text-xs text-muted-foreground">{event.actor.name}</span>
                ) : null}
              </div>
              {event.summary ? (
                <p className="mt-2 text-sm text-muted-foreground">{event.summary}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={fetchNextPage}
        >
          {isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
        </Button>
      ) : null}
    </div>
  );
}

type CustomerPaymentsTabProps = {
  customerId: string;
  active: boolean;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  confirmed: 'تأیید شده',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
};

export function CustomerPaymentsTab({ customerId, active }: CustomerPaymentsTabProps) {
  const {
    items,
    summary,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useCustomerPayments(customerId, active);

  if (isLoading) {
    return <TabLoadingSkeleton />;
  }

  if (isError) {
    return (
      <TabErrorState
        message={error instanceof Error ? error.message : 'بارگذاری پرداخت‌ها ناموفق بود.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="مجموع پرداخت‌شده (ریال)" value={summary.totalPaidRial} />
          <SummaryCard
            label="پرداخت‌های در انتظار"
            value={String(summary.pendingCount)}
            isCount
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            پرداختی ثبت نشده است.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">فروش</th>
                <th className="px-3 py-2 text-start font-medium">قسط</th>
                <th className="px-3 py-2 text-start font-medium">مبلغ (ریال)</th>
                <th className="px-3 py-2 text-start font-medium">وضعیت</th>
                <th className="px-3 py-2 text-start font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((payment: CustomerPaymentListItemDto) => (
                <tr key={payment.paymentId} className="border-t border-border/80">
                  <td className="px-3 py-2">{payment.saleTitle ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatPersianDigits(payment.installmentNumber)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatPersianDigits(payment.amountRial)}
                  </td>
                  <td className="px-3 py-2">
                    {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                  </td>
                  <td className="px-3 py-2">
                    {payment.confirmedAt
                      ? formatIsoDateAsJalali(payment.confirmedAt.slice(0, 10))
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={fetchNextPage}
        >
          {isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
        </Button>
      ) : null}
    </div>
  );
}

type CustomerContractsTabProps = {
  customerId: string;
  active: boolean;
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  cancelled: 'لغو شده',
  closed: 'بسته',
  overdue: 'معوق',
};

export function CustomerContractsTab({ customerId, active }: CustomerContractsTabProps) {
  const { items, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useCustomerContracts(customerId, active);

  if (isLoading) {
    return <TabLoadingSkeleton />;
  }

  if (isError) {
    return (
      <TabErrorState
        message={error instanceof Error ? error.message : 'بارگذاری قراردادها ناموفق بود.'}
        onRetry={() => void refetch()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          قراردادی ثبت نشده است.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-medium">عنوان</th>
              <th className="px-3 py-2 text-start font-medium">وضعیت</th>
              <th className="px-3 py-2 text-start font-medium">مبلغ کل</th>
              <th className="px-3 py-2 text-start font-medium">پرداخت‌شده</th>
              <th className="px-3 py-2 text-start font-medium">شعبه</th>
              <th className="px-3 py-2 text-start font-medium">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((contract: CustomerContractListItemDto) => (
              <tr key={contract.saleId} className="border-t border-border/80">
                <td className="px-3 py-2">{contract.title ?? '—'}</td>
                <td className="px-3 py-2">
                  {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {formatPersianDigits(contract.totalAmountRial)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {formatPersianDigits(contract.paidAmountRial)}
                </td>
                <td className="px-3 py-2">{contract.branchName}</td>
                <td className="px-3 py-2">
                  {formatIsoDateAsJalali(contract.contractDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={fetchNextPage}
        >
          {isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
        </Button>
      ) : null}
    </div>
  );
}

function TabLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function TabErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-destructive">{message}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          تلاش مجدد
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  isCount = false,
}: {
  label: string;
  value: string;
  isCount?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {isCount ? formatPersianDigits(Number(value)) : formatPersianDigits(value)}
        </p>
      </CardContent>
    </Card>
  );
}
