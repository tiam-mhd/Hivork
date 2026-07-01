import { ColumnPersonalizationSchema, type ColumnPersonalization } from '@hivork/contracts/ui';

import type { DataTableColumnDef } from '@/components/data-table/types';

export type ColumnVisibilityState = ColumnPersonalization['visibility'];
export type ColumnOrderState = ColumnPersonalization['order'];

export function isColumnHidingEnabled<T>(column: DataTableColumnDef<T>): boolean {
  return column.enableHiding !== false;
}

export function buildDefaultColumnState<T>(
  columns: DataTableColumnDef<T>[],
): ColumnPersonalization {
  const order = columns.map((column) => column.id);
  const visibility: ColumnVisibilityState = {};

  for (const column of columns) {
    if (!isColumnHidingEnabled(column)) {
      visibility[column.id] = true;
      continue;
    }
    visibility[column.id] = column.defaultHidden !== true;
  }

  return { order, visibility };
}

export function countVisibleColumns(state: ColumnPersonalization): number {
  return state.order.filter((id) => state.visibility[id] !== false).length;
}

export function countHideableVisibleColumns<T>(
  state: ColumnPersonalization,
  columns: DataTableColumnDef<T>[],
): number {
  return state.order.filter((id) => {
    const column = columns.find((item) => item.id === id);
    return (
      column &&
      isColumnHidingEnabled(column) &&
      state.visibility[id] !== false
    );
  }).length;
}

export function canHideColumn<T>(
  state: ColumnPersonalization,
  columnId: string,
  columns: DataTableColumnDef<T>[],
): boolean {
  const column = columns.find((item) => item.id === columnId);
  if (!column || !isColumnHidingEnabled(column)) {
    return false;
  }
  if (state.visibility[columnId] === false) {
    return true;
  }
  return countHideableVisibleColumns(state, columns) > 1;
}

export function toggleColumnVisibility<T>(
  state: ColumnPersonalization,
  columnId: string,
  columns: DataTableColumnDef<T>[],
): ColumnPersonalization {
  const column = columns.find((item) => item.id === columnId);
  if (!column || !isColumnHidingEnabled(column)) {
    return state;
  }

  const isVisible = state.visibility[columnId] !== false;
  if (isVisible && !canHideColumn(state, columnId, columns)) {
    return state;
  }

  return {
    ...state,
    visibility: {
      ...state.visibility,
      [columnId]: !isVisible,
    },
  };
}

export function reorderColumns(
  state: ColumnPersonalization,
  activeId: string,
  overId: string,
): ColumnPersonalization {
  if (activeId === overId) {
    return state;
  }

  const oldIndex = state.order.indexOf(activeId);
  const newIndex = state.order.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0) {
    return state;
  }

  const order = [...state.order];
  order.splice(oldIndex, 1);
  order.splice(newIndex, 0, activeId);

  return { ...state, order };
}

export function mergeColumnPersonalization<T>(
  columns: DataTableColumnDef<T>[],
  saved: ColumnPersonalization | null | undefined,
): ColumnPersonalization {
  const defaults = buildDefaultColumnState(columns);
  if (!saved) {
    return defaults;
  }

  const knownIds = new Set(columns.map((column) => column.id));
  const order = saved.order.filter((id) => knownIds.has(id));

  for (const column of columns) {
    if (!order.includes(column.id)) {
      order.push(column.id);
    }
  }

  const visibility: ColumnVisibilityState = { ...defaults.visibility };
  for (const [id, visible] of Object.entries(saved.visibility)) {
    if (!knownIds.has(id)) {
      continue;
    }
    const column = columns.find((item) => item.id === id);
    if (!column) {
      continue;
    }
    visibility[id] = isColumnHidingEnabled(column) ? visible : true;
  }

  for (const column of columns) {
    if (!isColumnHidingEnabled(column)) {
      visibility[column.id] = true;
    }
  }

  if (countVisibleColumns({ order, visibility }) === 0) {
    const fallback =
      columns.find((column) => isColumnHidingEnabled(column))?.id ?? columns[0]?.id;
    if (fallback) {
      visibility[fallback] = true;
    }
  }

  const widths = saved.widths
    ? Object.fromEntries(
        Object.entries(saved.widths).filter(([id]) => knownIds.has(id)),
      )
    : undefined;

  return {
    order,
    visibility,
    ...(Object.keys(widths ?? {}).length > 0 ? { widths } : {}),
  };
}

export function applyColumnPersonalization<T>(
  columns: DataTableColumnDef<T>[],
  state: ColumnPersonalization,
): DataTableColumnDef<T>[] {
  const byId = new Map(columns.map((column) => [column.id, column]));

  return state.order
    .filter((id) => state.visibility[id] !== false)
    .map((id) => {
      const column = byId.get(id);
      if (!column) {
        return null;
      }

      const savedWidth = state.widths?.[id];
      if (savedWidth === undefined) {
        return column;
      }

      return { ...column, width: savedWidth };
    })
    .filter((column): column is DataTableColumnDef<T> => column !== null);
}

export function loadColumnPersonalization(storageKey: string): ColumnPersonalization | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = ColumnPersonalizationSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[column-personalization] invalid saved state', parsed.error.flatten());
      }
      return null;
    }

    return parsed.data;
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[column-personalization] failed to read localStorage');
    }
    return null;
  }
}

export function saveColumnPersonalization(
  storageKey: string,
  state: ColumnPersonalization,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Private browsing / quota — in-memory only for this session.
  }
}

export function clearColumnPersonalization(storageKey: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

export function getColumnSettingsItems<T>(
  columns: DataTableColumnDef<T>[],
  state: ColumnPersonalization,
): Array<{
  id: string;
  label: string;
  visible: boolean;
  canHide: boolean;
  locked: boolean;
}> {
  return state.order
    .map((id) => {
      const column = columns.find((item) => item.id === id);
      if (!column) {
        return null;
      }

      const locked = !isColumnHidingEnabled(column);
      const visible = state.visibility[id] !== false;

      return {
        id,
        label: column.header,
        visible,
        canHide: locked ? false : canHideColumn(state, id, columns),
        locked,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
