'use client';

import type { ColumnPersonalization } from '@hivork/contracts/ui';
import { buildColumnStorageKey } from '@hivork/contracts/ui';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ColumnSettingsTrigger } from '@/components/data-table/column-settings-trigger';
import type { DataTableColumnDef } from '@/components/data-table/types';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import {
  applyColumnPersonalization,
  buildDefaultColumnState,
  clearColumnPersonalization,
  loadColumnPersonalization,
  mergeColumnPersonalization,
  saveColumnPersonalization,
} from '@/lib/data-table/column-personalization.utils';

export type UseColumnPersonalizationOptions = {
  onColumnStateChange?: (state: ColumnPersonalization) => void;
};

export type UseColumnPersonalizationResult<T> = {
  columns: DataTableColumnDef<T>[];
  columnState: ColumnPersonalization;
  setColumnState: (state: ColumnPersonalization) => void;
  resetToDefault: () => void;
  columnSettingsTrigger: ReactNode;
  openSettings: () => void;
};

function buildColumnSignature<T>(columns: DataTableColumnDef<T>[]): string {
  return columns
    .map(
      (column) =>
        `${column.id}:${column.enableHiding === false ? '0' : '1'}:${column.defaultHidden ? '1' : '0'}`,
    )
    .join('|');
}

export function useColumnPersonalization<T>(
  resourceKey: string,
  defaultColumns: DataTableColumnDef<T>[],
  options?: UseColumnPersonalizationOptions,
): UseColumnPersonalizationResult<T> {
  const { staff } = useAdminSession();
  const staffId = staff?.id ?? 'session';
  const storageKey = buildColumnStorageKey(resourceKey, staffId);
  const columnSignature = useMemo(
    () => buildColumnSignature(defaultColumns),
    [defaultColumns],
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [columnState, setColumnStateInternal] = useState<ColumnPersonalization>(() =>
    mergeColumnPersonalization(
      defaultColumns,
      typeof window === 'undefined' ? null : loadColumnPersonalization(storageKey),
    ),
  );

  useEffect(() => {
    const saved = loadColumnPersonalization(storageKey);
    const merged = mergeColumnPersonalization(defaultColumns, saved);
    setColumnStateInternal(merged);
    options?.onColumnStateChange?.(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when staff/resource/columns change
  }, [storageKey, columnSignature]);

  const setColumnState = useCallback(
    (next: ColumnPersonalization) => {
      const merged = mergeColumnPersonalization(defaultColumns, next);
      setColumnStateInternal(merged);
      saveColumnPersonalization(storageKey, merged);
      options?.onColumnStateChange?.(merged);
    },
    [defaultColumns, options, storageKey],
  );

  const resetToDefault = useCallback(() => {
    clearColumnPersonalization(storageKey);
    const defaults = buildDefaultColumnState(defaultColumns);
    setColumnStateInternal(defaults);
    options?.onColumnStateChange?.(defaults);
  }, [defaultColumns, options, storageKey]);

  const columns = useMemo(
    () => applyColumnPersonalization(defaultColumns, columnState),
    [columnState, defaultColumns],
  );

  const columnSettingsTrigger = (
    <ColumnSettingsTrigger
      columns={defaultColumns}
      columnState={columnState}
      onColumnStateChange={setColumnState}
      onReset={resetToDefault}
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
    />
  );

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  return {
    columns,
    columnState,
    setColumnState,
    resetToDefault,
    columnSettingsTrigger,
    openSettings,
  };
}
