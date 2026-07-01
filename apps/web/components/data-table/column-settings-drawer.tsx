'use client';

import type { ColumnPersonalization } from '@hivork/contracts/ui';
import { useEffect } from 'react';

import type { DataTableColumnDef } from './types';
import { ColumnSettingsPanel } from './column-settings-panel';

type ColumnSettingsDrawerProps<T> = {
  open: boolean;
  onClose: () => void;
  columns: DataTableColumnDef<T>[];
  columnState: ColumnPersonalization;
  onColumnStateChange: (state: ColumnPersonalization) => void;
  onReset: () => void;
};

export function ColumnSettingsDrawer<T>({
  open,
  onClose,
  columns,
  columnState,
  onColumnStateChange,
  onReset,
}: ColumnSettingsDrawerProps<T>) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="بستن تنظیم ستون‌ها"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto p-3">
        <ColumnSettingsPanel
          columns={columns}
          columnState={columnState}
          onColumnStateChange={onColumnStateChange}
          onReset={onReset}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
