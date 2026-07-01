'use client';

import type { DataTableSortDir, RowSelectionState } from '@hivork/contracts/ui';
import { cn } from '@hivork/ui';

import { cycleDataTableSort, resolveAriaSort } from '@/lib/data-table/sort-utils';
import { DataTableSelectionHeaderCell } from './data-table-selection-column';

import type { DataTableColumnDef } from './types';

type DataTableHeaderProps<T> = {
  columns: DataTableColumnDef<T>[];
  sortBy?: string;
  sortDir?: DataTableSortDir;
  sortWhitelist: readonly string[];
  onSortChange?: (sortBy: string | undefined, sortDir: DataTableSortDir | undefined) => void;
  enableRowSelection?: boolean;
  selectableIds?: readonly string[];
  rowSelection?: RowSelectionState;
  onToggleSelectAll?: () => void;
  selectionDisabled?: boolean;
};

function SortIndicator({ active, dir }: { active: boolean; dir?: DataTableSortDir }) {
  if (!active) {
    return (
      <span className="ms-1 inline-block text-muted-foreground/50" aria-hidden>
        ↕
      </span>
    );
  }

  return (
    <span className="ms-1 inline-block text-foreground" aria-hidden>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

function alignClass(align: DataTableColumnDef<unknown>['align']): string {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'end':
      return 'text-end';
    default:
      return 'text-start';
  }
}

export function DataTableHeader<T>({
  columns,
  sortBy,
  sortDir,
  sortWhitelist,
  onSortChange,
  enableRowSelection = false,
  selectableIds = [],
  rowSelection = {},
  onToggleSelectAll,
  selectionDisabled = false,
}: DataTableHeaderProps<T>) {
  return (
    <thead className="sticky top-0 z-20 bg-muted/40 backdrop-blur-sm">
      <tr className="border-b border-border text-xs font-medium text-muted-foreground">
        {enableRowSelection ? (
          <DataTableSelectionHeaderCell
            selectableIds={selectableIds}
            rowSelection={rowSelection}
            onToggleAll={() => onToggleSelectAll?.()}
            disabled={selectionDisabled}
          />
        ) : null}
        {columns.map((column) => {
          const sortable =
            column.sortable === true && sortWhitelist.includes(column.id) && Boolean(onSortChange);
          const isActive = sortBy === column.id;
          const ariaSort = resolveAriaSort(column.id, sortBy, sortDir);

          const style = column.width
            ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width }
            : undefined;

          if (!sortable) {
            return (
              <th
                key={column.id}
                scope="col"
                style={style}
                className={cn(
                  'px-4 py-3',
                  alignClass(column.align),
                  column.hideOnMobile && 'hidden md:table-cell',
                )}
              >
                {column.header}
              </th>
            );
          }

          return (
            <th
              key={column.id}
              scope="col"
              aria-sort={ariaSort}
              style={style}
              className={cn(
                'px-4 py-3',
                alignClass(column.align),
                column.hideOnMobile && 'hidden md:table-cell',
              )}
            >
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 transition-colors',
                  'hover:bg-muted hover:text-foreground',
                  isActive && 'text-foreground',
                )}
                onClick={() => {
                  const next = cycleDataTableSort(column.id, sortWhitelist, { sortBy, sortDir });
                  onSortChange?.(next.sortBy, next.sortDir);
                }}
              >
                <span>{column.header}</span>
                <SortIndicator active={isActive} dir={sortDir} />
              </button>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
