'use client';

import type { SavedViewItemDto } from '@hivork/contracts/core';
import type { TenantCustomerListItemDto } from '@hivork/contracts/customers';
import type { ExportCustomersRequestDto } from '@hivork/contracts/customers';
import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import {
  createCustomerListColumns,
  renderCustomerMobileCard,
} from '@/components/customers/customer-list-columns';
import { CustomerListFilters } from '@/components/customers/customer-list-filters';
import { DataTable, ExportButton, ViewSelector, type BulkAction } from '@/components/data-table';
import { FilterBuilderButton, SavedFiltersDropdown } from '@/components/filter-builder';
import { SearchInput } from '@/components/search-input';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useColumnPersonalization } from '@/hooks/use-column-personalization';
import { useCustomersList } from '@/hooks/use-customers-list';
import { useDataTableSelection } from '@/hooks/use-data-table-selection';
import { usePermission } from '@/hooks/use-permission';
import { useSavedFilters } from '@/hooks/use-saved-filters';
import { useSavedViews } from '@/hooks/use-saved-views';
import {
  CUSTOMER_FILTER_FIELDS,
  CUSTOMER_QUICK_FILTER_PRESETS,
} from '@/lib/filter-fields/customers';
import { apiDownload, ApiClientError, triggerBrowserDownload } from '@/lib/api/download';

export default function CustomersListPage() {
  return (
    <RequirePermission permission="installments.customer.view">
      <Suspense fallback={<CustomersListPageSkeleton />}>
        <CustomersListContent />
      </Suspense>
    </RequirePermission>
  );
}

function CustomersListPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      <DataTable
        aria-label="لیست مشتریان"
        columns={[]}
        data={[]}
        isLoading
        isError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => undefined}
        sortWhitelist={[]}
      />
    </div>
  );
}

function CustomersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedDefaultViewRef = useRef(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const canCreate = usePermission('installments.customer.create');
  const canImport = usePermission('installments.customer.import');
  const canUpdate = usePermission('installments.customer.update');
  const canRecycle = usePermission('core.recycle.view');
  const canView = usePermission('installments.customer.view');

  const {
    filters,
    setFilters,
    setSearch,
    filterAst,
    setFilterAst,
    clearFilters,
    setSort,
    sortBy,
    sortDir,
    sortWhitelist,
    items,
    hasNext,
    total,
    loading,
    loadingMore,
    isSearching,
    error,
    forbidden,
    retry,
    loadMore,
    isEmpty,
    emptyVariant,
    displayedCount,
    hasActiveFilters,
    selectionResetKey,
  } = useCustomersList();

  const { items: savedFilterItems } = useSavedFilters('customers');
  const { defaultView } = useSavedViews('customers');

  const hasUrlState = Boolean(
    searchParams.get('filter') ||
      searchParams.get('search')?.trim() ||
      (searchParams.get('sort') && searchParams.get('sort') !== 'createdAt:desc'),
  );

  const defaultColumns = useMemo(
    () => createCustomerListColumns(canUpdate),
    [canUpdate],
  );

  const { columns, columnState, setColumnState, columnSettingsTrigger } = useColumnPersonalization(
    'customers',
    defaultColumns,
  );

  const applySavedView = useCallback(
    (view: SavedViewItemDto, options?: { silent?: boolean }) => {
      setColumnState(view.columnState);

      if (view.savedFilterId) {
        const filter = savedFilterItems.find((item) => item.id === view.savedFilterId);
        if (filter) {
          setFilterAst(filter.filterAst);
        } else if (view.filterAst) {
          setFilterAst(view.filterAst);
        } else {
          setFilterAst(null);
          if (!options?.silent) {
            setToast('فیلتر ذخیره‌شده این نما دیگر موجود نیست.');
          }
        }
      } else {
        setFilterAst(null);
      }

      setSearch(view.search ?? '');

      if (view.sortBy && view.sortDir) {
        setSort(view.sortBy, view.sortDir);
      }

      setActiveViewId(view.id);

      if (!options?.silent) {
        setToast(`نمای «${view.name}» اعمال شد`);
      }
    },
    [savedFilterItems, setColumnState, setFilterAst, setSearch, setSort],
  );

  useEffect(() => {
    if (appliedDefaultViewRef.current || hasUrlState || !defaultView) {
      return;
    }

    appliedDefaultViewRef.current = true;
    applySavedView(defaultView, { silent: true });
  }, [applySavedView, defaultView, hasUrlState]);

  const { rowSelection, setRowSelection, clearSelection } = useDataTableSelection({
    resetKey: selectionResetKey,
    onSelectionCleared: () => setToast('انتخاب‌ها پاک شد'),
  });

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const buildExportRequest = useCallback((): Omit<ExportCustomersRequestDto, 'format'> => {
    return {
      search: filters.search.trim() || undefined,
      filter: filterAst ?? undefined,
      sort: filters.sort,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      locale: 'fa-IR',
    };
  }, [filterAst, filters.search, filters.sort, filters.tags]);

  const bulkActions = useMemo<BulkAction<TenantCustomerListItemDto>[]>(
    () => [
      {
        id: 'bulk-export',
        label: 'خروجی انتخاب‌شده‌ها',
        variant: 'outline',
        permission: 'installments.customer.export',
        onExecute: async (rows) => {
          try {
            setToast('در حال آماده‌سازی فایل…');
            const result = await apiDownload('/customers/export', {
              method: 'POST',
              body: JSON.stringify({
                ...buildExportRequest(),
                format: 'xlsx',
                ids: rows.map((row) => row.id),
              }),
            });
            triggerBrowserDownload(result.blob, result.filename ?? 'customers-selected.xlsx');
            setToast(
              result.rowCount === 0 ? 'داده‌ای برای خروجی نیست' : 'دانلود فایل Excel آغاز شد',
            );
          } catch (error) {
            if (error instanceof ApiClientError && error.code === 'EXPORT_LIMIT_EXCEEDED') {
              setToast('تعداد ردیف‌ها از حد مجاز بیشتر است.');
              return;
            }
            setToast(error instanceof Error ? error.message : 'خطا در خروجی Excel');
          }
          clearSelection();
        },
      },
      {
        id: 'bulk-tag-stub',
        label: 'افزودن برچسب',
        permission: 'installments.customer.update',
        requiresConfirm: true,
        confirmTitle: 'افزودن برچسب به {n} مشتری؟',
        confirmDescription: 'این نسخه نمایشی است — API گروهی در فاز بعدی.',
        onExecute: async (rows) => {
          setToast(`${rows.length} مشتری به‌روزرسانی شد (نمایشی)`);
          clearSelection();
        },
      },
    ],
    [buildExportRequest, clearSelection],
  );

  const customerQuickFilters = (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-muted-foreground">فیلترهای سریع:</span>
      {CUSTOMER_QUICK_FILTER_PRESETS.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          variant="outline"
          size="sm"
          title={preset.description}
          onClick={() => {
            if (preset.id === 'vip') {
              setFilterAst({
                root: {
                  type: 'group',
                  logic: 'and',
                  children: [
                    {
                      type: 'condition',
                      field: 'status',
                      operator: 'eq',
                      value: 'active',
                    },
                  ],
                },
              });
              return;
            }

            setFilterAst({
              root: {
                type: 'group',
                logic: 'and',
                children: [
                  {
                    type: 'condition',
                    field: 'balanceRial',
                    operator: 'gt',
                    value: '0',
                  },
                ],
              },
            });
          }}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );

  if (forbidden) {
    return <NoPermissionPage required="installments.customer.view" />;
  }

  const pageActions = (
    <>
      {canRecycle ? (
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/customers/recycle">سطل بازیافت</Link>
        </Button>
      ) : null}
      {canImport ? (
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/customers/import">ورود Excel</Link>
        </Button>
      ) : null}
      {canCreate ? (
        <Button asChild size="sm">
          <Link href="/admin/customers/new">＋ مشتری جدید</Link>
        </Button>
      ) : null}
    </>
  );

  const emptyAction =
    emptyVariant === 'no-results' ? (
      hasActiveFilters ? (
        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
          پاک کردن فیلتر
        </Button>
      ) : null
    ) : canCreate ? (
      <Button asChild>
        <Link href="/admin/customers/new">＋ مشتری جدید</Link>
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      {toast ? (
        <div
          className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">مشتریان</h1>
          <p className="text-sm text-muted-foreground">مدیریت مشتریان و پرونده‌های اقساطی</p>
        </div>
        <div className="flex flex-wrap gap-2">{pageActions}</div>
      </header>

      <DataTable
        aria-label="لیست مشتریان"
        columns={columns}
        data={items}
        isLoading={loading}
        isError={Boolean(error)}
        error={error ? new Error(error) : null}
        onRetry={retry}
        hasNextPage={hasNext}
        isFetchingNextPage={loadingMore}
        fetchNextPage={loadMore}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={setSort}
        sortWhitelist={sortWhitelist}
        enableRowSelection={canView}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        bulkActions={bulkActions}
        emptyTitle={emptyVariant === 'no-results' ? 'نتیجه‌ای یافت نشد' : 'هنوز مشتری ثبت نکرده‌اید'}
        emptyDescription={
          emptyVariant === 'no-results'
            ? 'فیلترها را تغییر دهید یا جستجو را پاک کنید.'
            : 'اولین مشتری خود را اضافه کنید.'
        }
        emptyAction={isEmpty ? emptyAction : undefined}
        renderMobileCard={renderCustomerMobileCard}
        onRowClick={(row) => router.push(`/admin/customers/${row.id}/edit`)}
        totalCount={total}
        loadedCount={displayedCount}
        toolbar={
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-wrap items-center gap-3">
              <SearchInput
                value={filters.search}
                onChange={setSearch}
                isLoading={isSearching}
                disabled={loading}
              />
              <div className="flex shrink-0 items-center gap-2">
                <ViewSelector
                  resourceKey="customers"
                  activeViewId={activeViewId}
                  columnState={columnState}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  search={filters.search}
                  filterAst={filterAst}
                  savedFilters={savedFilterItems}
                  onSelectView={applySavedView}
                  onToast={setToast}
                  disabled={loading}
                />
                <SavedFiltersDropdown
                  resourceKey="customers"
                  fields={CUSTOMER_FILTER_FIELDS}
                  currentFilterAst={filterAst}
                  onApply={setFilterAst}
                  onToast={setToast}
                  disabled={loading}
                />
                <FilterBuilderButton
                  fields={CUSTOMER_FILTER_FIELDS}
                  value={filterAst}
                  onChange={setFilterAst}
                  onApply={setFilterAst}
                  quickFilters={customerQuickFilters}
                  disabled={loading}
                />
                {columnSettingsTrigger}
                <ExportButton
                  permission="installments.customer.export"
                  buildRequest={buildExportRequest}
                  disabled={loading}
                  onToast={setToast}
                />
              </div>
            </div>
            <CustomerListFilters
              value={filters}
              onChange={setFilters}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
              disabled={loading}
            />
          </div>
        }
      />

      {!loading && !error && !isEmpty && total !== undefined ? (
        <p className="text-xs text-muted-foreground md:hidden">
          نمایش {formatPersianDigits(displayedCount)} از {formatPersianDigits(total)}
        </p>
      ) : null}
    </div>
  );
}
