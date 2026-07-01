'use client';

import type { RowSelectionState } from '@hivork/contracts/ui';
import { cn } from '@hivork/ui';
import type { MouseEvent, ReactNode } from 'react';

import { DataTableSelectionRowCell } from './data-table-selection-column';
import type { DataTableColumnDef } from './types';

function getCellValue<T>(row: T, column: DataTableColumnDef<T>): ReactNode {
  if (column.cell) {
    return column.cell({ row });
  }

  if (column.accessorKey) {
    const value = row[column.accessorKey];
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  return '—';
}

type DataTableBodyProps<T extends { id: string }> = {
  columns: DataTableColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  getRowId?: (row: T) => string;
  isRowSelectable?: (row: T) => boolean;
  rowNotSelectableReason?: string;
  onRowToggle?: (rowIndex: number, event: MouseEvent<HTMLButtonElement>) => void;
};

export function DataTableBody<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  getRowClassName,
  enableRowSelection = false,
  rowSelection = {},
  getRowId = (row) => row.id,
  isRowSelectable,
  rowNotSelectableReason = 'این ردیف قابل انتخاب نیست',
  onRowToggle,
}: DataTableBodyProps<T>) {
  return (
    <tbody>
      {data.map((row, index) => {
        const rowId = getRowId(row);
        const clickable = Boolean(onRowClick);
        const rowMuted = index % 2 === 1;
        const selectable = !isRowSelectable || isRowSelectable(row);
        const selected = Boolean(rowSelection[rowId]);

        return (
          <tr
            key={rowId}
            aria-selected={enableRowSelection ? selected : undefined}
            className={cn(
              'border-b border-border/60 transition-colors last:border-0',
              rowMuted && 'bg-muted/10',
              clickable && 'cursor-pointer hover:bg-muted/40',
              selected && 'bg-primary/5 hover:bg-primary/10',
              getRowClassName?.(row),
            )}
            onClick={clickable ? () => onRowClick?.(row) : undefined}
            onKeyDown={
              clickable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick?.(row);
                    }
                  }
                : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? 'button' : undefined}
          >
            {enableRowSelection ? (
              <DataTableSelectionRowCell
                rowId={rowId}
                checked={selected}
                disabled={!selectable}
                disabledReason={rowNotSelectableReason}
                onToggle={(event) => onRowToggle?.(index, event)}
              />
            ) : null}
            {columns.map((column) => {
              const style = column.width
                ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width }
                : undefined;

              return (
                <td
                  key={column.id}
                  style={style}
                  className={cn(
                    'px-4 py-3 text-sm text-foreground',
                    column.align === 'center' && 'text-center',
                    column.align === 'end' && 'text-end',
                    column.align === 'start' && 'text-start',
                    column.hideOnMobile && 'hidden md:table-cell',
                    column.meta?.moneyRial && 'font-mono tabular-nums',
                  )}
                  dir={column.meta?.moneyRial ? 'ltr' : undefined}
                >
                  {getCellValue(row, column)}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}
