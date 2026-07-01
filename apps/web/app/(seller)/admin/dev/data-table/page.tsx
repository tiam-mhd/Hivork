'use client';

import { Button } from '@hivork/ui';
import { notFound } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DataTable, type BulkAction, type DataTableColumnDef } from '@/components/data-table';
import { useColumnPersonalization } from '@/hooks/use-column-personalization';

type DemoRow = {
  id: string;
  name: string;
  amountRial: string;
  status: string;
  createdAt: string;
};

const DEMO_ROWS: DemoRow[] = Array.from({ length: 12 }).map((_, index) => ({
  id: `demo-${index + 1}`,
  name: `مشتری نمونه ${index + 1}`,
  amountRial: String((index + 1) * 1_000_000),
  status: index % 2 === 0 ? 'فعال' : 'معوق',
  createdAt: '2026-06-01',
}));

const SORT_WHITELIST = ['name', 'amountRial', 'createdAt'] as const;

const DEFAULT_DEMO_COLUMNS: DataTableColumnDef<DemoRow>[] = [
  { id: 'name', header: 'نام', sortable: true },
  {
    id: 'amountRial',
    header: 'مبلغ (ریال)',
    sortable: true,
    align: 'end',
    meta: { moneyRial: true },
    cell: ({ row }) => row.amountRial,
  },
  { id: 'status', header: 'وضعیت', defaultHidden: true },
  { id: 'createdAt', header: 'تاریخ', sortable: true, hideOnMobile: true },
];

export default function DataTableDevPage() {
  if (process.env.NEXT_PUBLIC_DEV_TOOLS !== 'true') {
    notFound();
  }

  const [sortBy, setSortBy] = useState<string | undefined>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>('desc');
  const [visibleCount, setVisibleCount] = useState(5);
  const [simulateError, setSimulateError] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const bulkActions = useMemo<BulkAction<DemoRow>[]>(
    () => [
      {
        id: 'demo-export',
        label: 'خروجی',
        variant: 'outline',
        onExecute: async (rows) => {
          setToast(`${rows.length} ردیف انتخاب شد`);
          setRowSelection({});
        },
      },
      {
        id: 'demo-delete',
        label: 'حذف',
        variant: 'destructive',
        onExecute: async (rows) => {
          setToast(`${rows.length} ردیف حذف شد (نمایشی)`);
          setRowSelection({});
        },
      },
    ],
    [],
  );

  const { columns, columnSettingsTrigger } = useColumnPersonalization(
    'dev-data-table',
    DEFAULT_DEMO_COLUMNS,
  );

  const sorted = useMemo(() => {
    const copy = [...DEMO_ROWS];
    if (!sortBy || !sortDir) {
      return copy;
    }

    copy.sort((a, b) => {
      const left = a[sortBy as keyof DemoRow];
      const right = b[sortBy as keyof DemoRow];
      if (left === right) return 0;
      if (sortDir === 'asc') {
        return left > right ? 1 : -1;
      }
      return left < right ? 1 : -1;
    });
    return copy;
  }, [sortBy, sortDir]);

  const data = sorted.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">DataTable Dev Demo</h1>
        <p className="text-sm text-muted-foreground">
          فقط با `NEXT_PUBLIC_DEV_TOOLS=true` — sort، pagination، states
        </p>
      </header>

      {toast ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" role="status">
          {toast}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setSimulateError((v) => !v)}>
          {simulateError ? 'رفع خطا' : 'شبیه‌سازی خطا'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setVisibleCount(0)}>
          خالی
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setVisibleCount(5)}>
          ۵ ردیف
        </Button>
      </div>

      <DataTable
        aria-label="جدول نمونه توسعه"
        columns={columns}
        data={simulateError ? data : data}
        isLoading={false}
        isError={simulateError}
        error={simulateError ? new Error('خطای آزمایشی') : null}
        onRetry={() => setSimulateError(false)}
        hasNextPage={visibleCount < DEMO_ROWS.length}
        isFetchingNextPage={false}
        fetchNextPage={() => setVisibleCount((count) => Math.min(count + 5, DEMO_ROWS.length))}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(nextSortBy, nextSortDir) => {
          setSortBy(nextSortBy);
          setSortDir(nextSortDir);
        }}
        sortWhitelist={SORT_WHITELIST}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        bulkActions={bulkActions}
        isRowSelectable={(row) => row.id !== 'demo-3'}
        rowNotSelectableReason="ردیف نمونه غیرقابل انتخاب"
        totalCount={DEMO_ROWS.length}
        loadedCount={data.length}
        renderMobileCard={(row) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{row.name}</p>
            <p className="text-muted-foreground" dir="ltr">
              {row.amountRial} ریال
            </p>
          </div>
        )}
        toolbar={
          <div className="flex w-full items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">Toolbar slot (filters / export)</div>
            {columnSettingsTrigger}
          </div>
        }
      />
    </div>
  );
}
