import type { RowSelectionState } from '@hivork/contracts/ui';

export type HeaderSelectionState = 'none' | 'some' | 'all';

export function countSelected(rowSelection: RowSelectionState): number {
  return Object.values(rowSelection).filter(Boolean).length;
}

export function getSelectableRowIds<T extends { id: string }>(
  data: T[],
  isRowSelectable?: (row: T) => boolean,
): string[] {
  if (!isRowSelectable) {
    return data.map((row) => row.id);
  }
  return data.filter(isRowSelectable).map((row) => row.id);
}

export function resolveHeaderSelectionState(
  selectableIds: readonly string[],
  rowSelection: RowSelectionState,
): HeaderSelectionState {
  if (selectableIds.length === 0) {
    return 'none';
  }

  const selectedCount = selectableIds.filter((id) => rowSelection[id]).length;
  if (selectedCount === 0) {
    return 'none';
  }
  if (selectedCount === selectableIds.length) {
    return 'all';
  }
  return 'some';
}

export function headerSelectionToChecked(
  state: HeaderSelectionState,
): boolean | 'indeterminate' {
  switch (state) {
    case 'all':
      return true;
    case 'some':
      return 'indeterminate';
    default:
      return false;
  }
}

export function toggleSelectAllLoaded(
  selectableIds: readonly string[],
  rowSelection: RowSelectionState,
): RowSelectionState {
  const headerState = resolveHeaderSelectionState(selectableIds, rowSelection);
  const next = { ...rowSelection };

  if (headerState === 'all') {
    for (const id of selectableIds) {
      delete next[id];
    }
    return next;
  }

  for (const id of selectableIds) {
    next[id] = true;
  }
  return next;
}

export function toggleRowSelection(
  rowId: string,
  rowSelection: RowSelectionState,
  selected: boolean,
): RowSelectionState {
  const next = { ...rowSelection };
  if (selected) {
    next[rowId] = true;
  } else {
    delete next[rowId];
  }
  return next;
}

export function applyRangeSelection<T extends { id: string }>(
  data: T[],
  startIndex: number,
  endIndex: number,
  rowSelection: RowSelectionState,
  isRowSelectable?: (row: T) => boolean,
): RowSelectionState {
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  const next = { ...rowSelection };

  for (let index = from; index <= to; index += 1) {
    const row = data[index];
    if (!row) {
      continue;
    }
    if (isRowSelectable && !isRowSelectable(row)) {
      continue;
    }
    next[row.id] = true;
  }

  return next;
}

export function getSelectedRows<T extends { id: string }>(
  data: T[],
  rowSelection: RowSelectionState,
  getRowId: (row: T) => string = (row) => row.id,
): T[] {
  return data.filter((row) => rowSelection[getRowId(row)]);
}
