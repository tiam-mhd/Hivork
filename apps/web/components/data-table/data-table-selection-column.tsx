'use client';

import type { RowSelectionState } from '@hivork/contracts/ui';
import { Checkbox, cn } from '@hivork/ui';
import type { MouseEvent } from 'react';

import {
  headerSelectionToChecked,
  resolveHeaderSelectionState,
} from '@/lib/data-table/selection-utils';

const SELECTION_COLUMN_WIDTH = 44;

type DataTableSelectionHeaderCellProps = {
  selectableIds: readonly string[];
  rowSelection: RowSelectionState;
  onToggleAll: () => void;
  disabled?: boolean;
};

export function DataTableSelectionHeaderCell({
  selectableIds,
  rowSelection,
  onToggleAll,
  disabled = false,
}: DataTableSelectionHeaderCellProps) {
  const headerState = resolveHeaderSelectionState(selectableIds, rowSelection);
  const checked = headerSelectionToChecked(headerState);

  return (
    <th
      scope="col"
      style={{ width: SELECTION_COLUMN_WIDTH }}
      className="px-3 py-3 text-center"
      aria-label="انتخاب همه ردیف‌های بارگذاری‌شده"
    >
      <Checkbox
        checked={checked}
        disabled={disabled || selectableIds.length === 0}
        onCheckedChange={() => onToggleAll()}
        aria-label="انتخاب همه"
      />
    </th>
  );
}

type DataTableSelectionRowCellProps = {
  rowId: string;
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function DataTableSelectionRowCell({
  rowId,
  checked,
  disabled = false,
  disabledReason,
  onToggle,
}: DataTableSelectionRowCellProps) {
  return (
    <td
      style={{ width: SELECTION_COLUMN_WIDTH }}
      className="px-3 py-3 text-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span title={disabled ? disabledReason : undefined} className="inline-flex">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(event);
          }}
          aria-label={`انتخاب ردیف ${rowId}`}
        />
      </span>
    </td>
  );
}

export function DataTableMobileSelectionCheckbox({
  rowId,
  checked,
  disabled,
  disabledReason,
  onToggle,
}: Omit<DataTableSelectionRowCellProps, 'onToggle'> & {
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className={cn('mb-2 flex items-center gap-2', disabled && 'opacity-60')}
      onClick={(event) => event.stopPropagation()}
    >
      <span title={disabled ? disabledReason : undefined} className="inline-flex">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(event);
          }}
          aria-label={`انتخاب ${rowId}`}
        />
      </span>
      <span className="text-xs text-muted-foreground">انتخاب</span>
    </div>
  );
}
