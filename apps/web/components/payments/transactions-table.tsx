'use client';

import type { PaymentTransactionListItemDto } from '@hivork/contracts/payments';
import { isoToJalaliDisplay } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';

import { DataTable, DataTableEmpty, DataTableError } from '@/components/data-table';
import type { DataTableColumnDef } from '@/components/data-table';
import { formatToman } from '@/lib/i18n';
import {
  PAYMENT_ENTRY_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentMethodLabel,
} from '@/lib/payments/payment-labels';

type TransactionsTableProps = {
  items: PaymentTransactionListItemDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onSelect: (item: PaymentTransactionListItemDto) => void;
};

const columns: DataTableColumnDef<PaymentTransactionListItemDto>[] = [
  {
    id: 'occurredAt',
    header: 'تاریخ',
    sortable: false,
    cell: ({ row }) => isoToJalaliDisplay(row.occurredAt.slice(0, 10), 'fa', { persianDigits: true }),
  },
  {
    id: 'entryType',
    header: 'نوع',
    cell: ({ row }) => PAYMENT_ENTRY_TYPE_LABELS[row.entryType],
  },
  {
    id: 'paymentMethod',
    header: 'روش',
    cell: ({ row }) => paymentMethodLabel(row.paymentMethod),
  },
  {
    id: 'amountRial',
    header: 'مبلغ',
    align: 'end',
    cell: ({ row }) => formatToman(BigInt(row.amountRial)),
  },
  {
    id: 'status',
    header: 'وضعیت',
    cell: ({ row }) => PAYMENT_STATUS_LABELS[row.status],
  },
  {
    id: 'customer',
    header: 'مشتری',
    cell: ({ row }) =>
      row.customer ? (
        <Link
          href={`/admin/customers/${row.customer.id}`}
          className="text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.customer.displayName}
        </Link>
      ) : (
        '—'
      ),
  },
];

export function TransactionsTable({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  onRetry,
  onLoadMore,
  onSelect,
}: TransactionsTableProps) {
  if (error) {
    return <DataTableError message={error} onRetry={onRetry} />;
  }

  if (!loading && items.length === 0) {
    return (
      <DataTableEmpty
        title="تراکنشی یافت نشد"
        description="فیلترها را تغییر دهید یا تراکنش جدیدی ثبت کنید."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        aria-label="لیست تراکنش‌های پرداخت"
        columns={columns}
        data={items}
        isLoading={loading}
        isError={false}
        hasNextPage={hasMore}
        isFetchingNextPage={loadingMore}
        fetchNextPage={onLoadMore}
        sortWhitelist={[]}
        onRowClick={onSelect}
        renderMobileCard={(row) => (
          <button
            type="button"
            className="w-full rounded-xl border border-border bg-card p-4 text-start shadow-sm"
            onClick={() => onSelect(row)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{PAYMENT_ENTRY_TYPE_LABELS[row.entryType]}</span>
              <span className="text-sm text-muted-foreground">
                {PAYMENT_STATUS_LABELS[row.status]}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {formatToman(BigInt(row.amountRial))}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isoToJalaliDisplay(row.occurredAt.slice(0, 10), 'fa', { persianDigits: true })}
              {' · '}
              {paymentMethodLabel(row.paymentMethod)}
            </p>
          </button>
        )}
      />
      {hasMore && !loading ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function TransactionsTableSkeleton() {
  return (
    <DataTable
      aria-label="لیست تراکنش‌های پرداخت"
      columns={columns}
      data={[]}
      isLoading
      isError={false}
      hasNextPage={false}
      isFetchingNextPage={false}
      fetchNextPage={() => undefined}
      sortWhitelist={[]}
    />
  );
}
