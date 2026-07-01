import { describe, expect, it } from 'vitest';

import type { DataTableColumnDef } from '@/components/data-table/types';

import {
  applyColumnPersonalization,
  buildDefaultColumnState,
  canHideColumn,
  mergeColumnPersonalization,
  reorderColumns,
  toggleColumnVisibility,
} from './column-personalization.utils';

const COLUMNS: DataTableColumnDef<{ id: string }>[] = [
  { id: 'name', header: 'نام' },
  { id: 'phone', header: 'شماره', defaultHidden: true },
  { id: 'actions', header: 'عملیات', enableHiding: false },
];

describe('mergeColumnPersonalization', () => {
  it('merges saved order and visibility with defaults', () => {
    const merged = mergeColumnPersonalization(COLUMNS, {
      order: ['phone', 'name', 'actions'],
      visibility: { name: true, phone: false, actions: true },
    });

    expect(merged.order).toEqual(['phone', 'name', 'actions']);
    expect(merged.visibility.phone).toBe(false);
    expect(merged.visibility.actions).toBe(true);
  });

  it('appends unknown saved ids and skips removed columns', () => {
    const merged = mergeColumnPersonalization(COLUMNS, {
      order: ['legacy', 'name'],
      visibility: { legacy: true, name: true, phone: true, actions: true },
    });

    expect(merged.order).toEqual(['name', 'phone', 'actions']);
    expect(merged.visibility.legacy).toBeUndefined();
  });
});

describe('toggleColumnVisibility', () => {
  it('cannot hide the last visible column', () => {
    const state = buildDefaultColumnState(COLUMNS);
    const onlyNameVisible = {
      ...state,
      visibility: { name: true, phone: false, actions: true },
    };

    expect(toggleColumnVisibility(onlyNameVisible, 'name', COLUMNS)).toEqual(onlyNameVisible);
    expect(canHideColumn(onlyNameVisible, 'name', COLUMNS)).toBe(false);
  });

  it('cannot hide locked columns', () => {
    const state = buildDefaultColumnState(COLUMNS);
    expect(toggleColumnVisibility(state, 'actions', COLUMNS)).toEqual(state);
  });
});

describe('applyColumnPersonalization', () => {
  it('returns ordered visible columns only', () => {
    const state = mergeColumnPersonalization(COLUMNS, {
      order: ['phone', 'name', 'actions'],
      visibility: { name: true, phone: false, actions: true },
    });

    const applied = applyColumnPersonalization(COLUMNS, state);
    expect(applied.map((column) => column.id)).toEqual(['name', 'actions']);
  });
});

describe('reorderColumns', () => {
  it('moves column id in order array', () => {
    const state = buildDefaultColumnState(COLUMNS);
    const next = reorderColumns(state, 'actions', 'name');
    expect(next.order).toEqual(['actions', 'name', 'phone']);
  });
});
