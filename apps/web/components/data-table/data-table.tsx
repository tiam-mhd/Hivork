'use client';

import { cn } from '@hivork/ui';
import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  applyRangeSelection,
  countSelected,
  getSelectableRowIds,
  getSelectedRows,
  toggleRowSelection,
  toggleSelectAllLoaded,
} from '@/lib/data-table/selection-utils';

import { BulkActionBar, type BulkAction } from './bulk-action-bar';
import { BulkConfirmDialog } from './bulk-confirm-dialog';
import { DataTableBody } from './data-table-body';
import { DataTableEmpty } from './data-table-empty';
import { DataTableError } from './data-table-error';
import { DataTableHeader } from './data-table-header';
import { DataTablePagination } from './data-table-pagination';
import { DataTableMobileSelectionCheckbox } from './data-table-selection-column';
import { DataTableSkeleton } from './data-table-skeleton';
import type { DataTableProps } from './types';

function actionNeedsConfirm<T>(action: BulkAction<T>): boolean {
  return action.requiresConfirm === true || action.variant === 'destructive';
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  sortBy,
  sortDir,
  onSortChange,
  sortWhitelist,
  emptyTitle = 'موردی یافت نشد',
  emptyDescription,
  emptyAction,
  toolbar,
  renderMobileCard,
  onRowClick,
  getRowClassName,
  skeletonRowCount = 5,
  totalCount,
  loadedCount,
  enableInfiniteScroll = true,
  'aria-label': ariaLabel,
  enableRowSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  getRowId = (row) => row.id,
  isRowSelectable,
  rowNotSelectableReason,
  bulkActions = [],
}: DataTableProps<T>) {
  const lastToggledIndexRef = useRef<number | null>(null);
  const [pendingAction, setPendingAction] = useState<BulkAction<T> | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const visibleColumns = columns;
  const count = loadedCount ?? data.length;
  const selectionEnabled = enableRowSelection && Boolean(onRowSelectionChange);

  const selectableIds = useMemo(
    () => getSelectableRowIds(data, isRowSelectable),
    [data, isRowSelectable],
  );

  const selectedCount = useMemo(() => countSelected(rowSelection), [rowSelection]);

  const handleToggleSelectAll = useCallback(() => {
    if (!onRowSelectionChange) {
      return;
    }
    onRowSelectionChange(toggleSelectAllLoaded(selectableIds, rowSelection));
  }, [onRowSelectionChange, rowSelection, selectableIds]);

  const handleRowToggle = useCallback(
    (rowIndex: number, event: MouseEvent<HTMLButtonElement>) => {
      if (!onRowSelectionChange) {
        return;
      }

      const row = data[rowIndex];
      if (!row) {
        return;
      }

      const rowId = getRowId(row);
      const currentlySelected = Boolean(rowSelection[rowId]);

      if (event.shiftKey && lastToggledIndexRef.current !== null) {
        onRowSelectionChange(
          applyRangeSelection(
            data,
            lastToggledIndexRef.current,
            rowIndex,
            rowSelection,
            isRowSelectable,
          ),
        );
        lastToggledIndexRef.current = rowIndex;
        return;
      }

      onRowSelectionChange(toggleRowSelection(rowId, rowSelection, !currentlySelected));
      lastToggledIndexRef.current = rowIndex;
    },
    [data, getRowId, isRowSelectable, onRowSelectionChange, rowSelection],
  );

  const executeAction = useCallback(
    async (action: BulkAction<T>) => {
      const selectedRows = getSelectedRows(data, rowSelection, getRowId);
      setIsExecuting(true);
      try {
        await action.onExecute(selectedRows);
      } finally {
        setIsExecuting(false);
        setPendingAction(null);
      }
    },
    [data, getRowId, rowSelection],
  );

  const handleActionClick = useCallback(
    (action: BulkAction<T>) => {
      if (actionNeedsConfirm(action)) {
        setPendingAction(action);
        return;
      }
      void executeAction(action);
    },
    [executeAction],
  );

  const handleClearSelection = useCallback(() => {
    onRowSelectionChange?.({});
  }, [onRowSelectionChange]);

  const bulkBar =
    selectionEnabled && selectedCount > 0 ? (
      <BulkActionBar
        selectedCount={selectedCount}
        onClearSelection={handleClearSelection}
        actions={bulkActions}
        isExecuting={isExecuting || isLoading}
        onActionClick={handleActionClick}
      />
    ) : null;

  const confirmDialog =
    pendingAction && selectionEnabled ? (
      <BulkConfirmDialog
        open
        title={
          pendingAction.confirmTitle ??
          (pendingAction.variant === 'destructive' ? 'حذف {n} مورد؟' : `اجرای «${pendingAction.label}»`)
        }
        description={
          pendingAction.confirmDescription ??
          (pendingAction.variant === 'destructive'
            ? 'این عمل قابل بازگشت است (soft delete).'
            : undefined)
        }
        selectedCount={selectedCount}
        loading={isExecuting}
        onConfirm={() => void executeAction(pendingAction)}
        onCancel={() => setPendingAction(null)}
      />
    ) : null;

  if (isLoading && data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        <DataTableSkeleton
          columnCount={visibleColumns.length + (selectionEnabled ? 1 : 0)}
          rowCount={skeletonRowCount}
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        <DataTableError message={error?.message} onRetry={onRetry} />
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        <DataTableEmpty title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">{toolbar}</div>
      ) : null}

      {bulkBar}

      {renderMobileCard ? (
        <div className="flex flex-col gap-3 md:hidden">
          {data.map((row, index) => {
            const rowId = getRowId(row);
            const selectable = !isRowSelectable || isRowSelectable(row);
            const selected = Boolean(rowSelection[rowId]);

            return (
              <div
                key={rowId}
                className={cn(
                  'rounded-xl border border-border bg-card p-4 shadow-sm',
                  onRowClick && 'cursor-pointer hover:bg-muted/30',
                  selected && 'border-primary/40 bg-primary/5',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-selected={selectionEnabled ? selected : undefined}
              >
                {selectionEnabled ? (
                  <DataTableMobileSelectionCheckbox
                    rowId={rowId}
                    checked={selected}
                    disabled={!selectable}
                    disabledReason={rowNotSelectableReason}
                    onToggle={(event) => handleRowToggle(index, event)}
                  />
                ) : null}
                {renderMobileCard(row)}
              </div>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
          renderMobileCard && 'hidden md:block',
        )}
      >
        <div className="max-h-[min(70vh,48rem)] overflow-auto">
          <table className="w-full min-w-[40rem] text-sm" aria-label={ariaLabel}>
            <DataTableHeader
              columns={visibleColumns}
              sortBy={sortBy}
              sortDir={sortDir}
              sortWhitelist={sortWhitelist}
              onSortChange={onSortChange}
              enableRowSelection={selectionEnabled}
              selectableIds={selectableIds}
              rowSelection={rowSelection}
              onToggleSelectAll={handleToggleSelectAll}
              selectionDisabled={isExecuting}
            />
            <DataTableBody
              columns={visibleColumns}
              data={data}
              onRowClick={onRowClick}
              getRowClassName={getRowClassName}
              enableRowSelection={selectionEnabled}
              rowSelection={rowSelection}
              getRowId={getRowId}
              isRowSelectable={isRowSelectable}
              rowNotSelectableReason={rowNotSelectableReason}
              onRowToggle={handleRowToggle}
            />
          </table>
        </div>
      </div>

      <DataTablePagination
        loadedCount={count}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        enableInfiniteScroll={enableInfiniteScroll}
      />

      {confirmDialog}
    </div>
  );
}
