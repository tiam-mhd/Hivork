import type { DataTableSortDir } from '@hivork/contracts/ui';

export type DataTableSortState = {
  sortBy?: string;
  sortDir?: DataTableSortDir;
};

/**
 * Toggle sort cycle: asc → desc → clear (only when column is whitelisted).
 */
export function cycleDataTableSort(
  columnId: string,
  whitelist: readonly string[],
  current: DataTableSortState,
): DataTableSortState {
  if (!whitelist.includes(columnId)) {
    return current;
  }

  if (current.sortBy !== columnId) {
    return { sortBy: columnId, sortDir: 'asc' };
  }

  if (current.sortDir === 'asc') {
    return { sortBy: columnId, sortDir: 'desc' };
  }

  return { sortBy: undefined, sortDir: undefined };
}

export function resolveAriaSort(
  columnId: string,
  sortBy?: string,
  sortDir?: DataTableSortDir,
): 'none' | 'ascending' | 'descending' {
  if (sortBy !== columnId || !sortDir) {
    return 'none';
  }
  return sortDir === 'asc' ? 'ascending' : 'descending';
}
