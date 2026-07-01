import { describe, expect, it } from 'vitest';

import { cycleDataTableSort, resolveAriaSort } from './sort-utils';

const WHITELIST = ['createdAt', 'name', 'overdueCount'] as const;

describe('cycleDataTableSort', () => {
  it('cycles asc → desc → clear', () => {
    let state = cycleDataTableSort('name', WHITELIST, {});
    expect(state).toEqual({ sortBy: 'name', sortDir: 'asc' });

    state = cycleDataTableSort('name', WHITELIST, state);
    expect(state).toEqual({ sortBy: 'name', sortDir: 'desc' });

    state = cycleDataTableSort('name', WHITELIST, state);
    expect(state).toEqual({ sortBy: undefined, sortDir: undefined });
  });

  it('rejects sort when column is not in whitelist', () => {
    const current = { sortBy: 'createdAt', sortDir: 'desc' as const };
    expect(cycleDataTableSort('secret', WHITELIST, current)).toEqual(current);
  });

  it('switches column resets to asc', () => {
    const state = cycleDataTableSort('overdueCount', WHITELIST, {
      sortBy: 'name',
      sortDir: 'desc',
    });
    expect(state).toEqual({ sortBy: 'overdueCount', sortDir: 'asc' });
  });
});

describe('resolveAriaSort', () => {
  it('maps sort state to aria-sort', () => {
    expect(resolveAriaSort('name', 'name', 'asc')).toBe('ascending');
    expect(resolveAriaSort('name', 'name', 'desc')).toBe('descending');
    expect(resolveAriaSort('name', 'createdAt', 'desc')).toBe('none');
  });
});
