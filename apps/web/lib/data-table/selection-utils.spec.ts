import { describe, expect, it } from 'vitest';

import {
  applyRangeSelection,
  getSelectableRowIds,
  headerSelectionToChecked,
  resolveHeaderSelectionState,
  toggleSelectAllLoaded,
} from './selection-utils';

type Row = { id: string; locked?: boolean };

const ROWS: Row[] = [
  { id: 'a' },
  { id: 'b' },
  { id: 'c', locked: true },
  { id: 'd' },
];

const isSelectable = (row: Row) => !row.locked;

describe('toggleSelectAllLoaded', () => {
  it('selects only loaded selectable rows', () => {
    const ids = getSelectableRowIds(ROWS, isSelectable);
    const next = toggleSelectAllLoaded(ids, {});
    expect(next).toEqual({ a: true, b: true, d: true });
  });

  it('clears loaded selectable rows when all are selected', () => {
    const ids = getSelectableRowIds(ROWS, isSelectable);
    const next = toggleSelectAllLoaded(ids, { a: true, b: true, d: true, x: true });
    expect(next).toEqual({ x: true });
  });
});

describe('resolveHeaderSelectionState', () => {
  it('returns indeterminate when some rows are selected', () => {
    const ids = getSelectableRowIds(ROWS, isSelectable);
    expect(resolveHeaderSelectionState(ids, { a: true })).toBe('some');
    expect(headerSelectionToChecked('some')).toBe('indeterminate');
  });

  it('returns all when every selectable row is selected', () => {
    const ids = getSelectableRowIds(ROWS, isSelectable);
    expect(resolveHeaderSelectionState(ids, { a: true, b: true, d: true })).toBe('all');
  });
});

describe('applyRangeSelection', () => {
  it('selects a contiguous range on shift+click', () => {
    const next = applyRangeSelection(ROWS, 0, 1, {}, isSelectable);
    expect(next).toEqual({ a: true, b: true });
  });
});
