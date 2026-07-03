'use client';

import type { CheckSummaryDto } from '@hivork/contracts/payments';
import { isoToJalaliDisplay } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';

import { DataTable, DataTableEmpty, DataTableError } from '@/components/data-table';
import type { DataTableColumnDef } from '@/components/data-table';
import { formatToman } from '@/lib/i18n';
import {
  CHECK_STATUS_LABELS,
  CHECK_TYPE_LABELS,
  checkStatusBadgeClass,
  checkStatusTone,
} from '@/lib/payments/check-labels';

type ChecksTableProps = {
  items: CheckSummaryDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onSelect: (item: CheckSummaryDto) => void;
};

function StatusBadge({ check }: { check: CheckSummaryDto }) {
  const tone = checkStatusTone(check.status, check.dueDate);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${checkStatusBadgeClass(tone)}`}
    >
      {CHECK_STATUS_LABELS[check.status]}
    </span>
  );
}

const columns: DataTableColumnDef<CheckSummaryDto>[] = [
  {
    id: 'checkNumber',
    header: 'شماره چک',
    cell: ({ row }) => row.checkNumber,
  },
  {
    id: 'bankName',
    header: 'بانک',
    cell: ({ row }) => row.bankName,
  },
  {
    id: 'amountRial',
    header: 'مبلغ',
    align: 'end',
    cell: ({ row }) => formatToman(BigInt(row.amountRial)),
  },
  {
    id: 'dueDate',
    header: 'سررسید',
    cell: ({ row }) => isoToJalaliDisplay(row.dueDate.slice(0, 10), 'fa', { persianDigits: true }),
  },
  {
    id: 'checkType',
    header: 'نوع',
    cell: ({ row }) => CHECK_TYPE_LABELS[row.checkType],
  },
  {
    id: 'status',
    header: 'وضعیت',
    cell: ({ row }) => <StatusBadge check={row} />,
  },
  {
    id: 'installmentId',
    header: 'قسط',
    cell: ({ row }) =>
      row.installmentId ? (
        <Link
          href={`/admin/installments/${row.installmentId}`}
          className="text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          مشاهده
        </Link>
      ) : (
        '—'
      ),
  },
];

export function ChecksTable({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  onRetry,
  onLoadMore,
  onSelect,
}: ChecksTableProps) {
  if (error) {
    return <DataTableError message={error} onRetry={onRetry} />;
  }

  if (!loading && items.length === 0) {
    return (
      <DataTableEmpty
        title="چکی ثبت نشده"
        description="با دکمه «ثبت چک» اولین چک را وارد کنید."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        aria-label="لیست چک‌ها"
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
              <span className="font-medium">{row.checkNumber}</span>
              <StatusBadge check={row} />
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {formatToman(BigInt(row.amountRial))}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.bankName} · {CHECK_TYPE_LABELS[row.checkType]}
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

export function ChecksTableSkeleton() {
  return (
    <DataTable
      aria-label="لیست چک‌ها"
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
