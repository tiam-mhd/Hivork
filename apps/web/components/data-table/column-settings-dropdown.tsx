'use client';

import type { ColumnPersonalization } from '@hivork/contracts/ui';
import { useEffect, useRef } from 'react';

import type { DataTableColumnDef } from './types';
import { ColumnSettingsPanel } from './column-settings-panel';

type ColumnSettingsDropdownProps<T> = {
  open: boolean;
  onClose: () => void;
  columns: DataTableColumnDef<T>[];
  columnState: ColumnPersonalization;
  onColumnStateChange: (state: ColumnPersonalization) => void;
  onReset: () => void;
};

export function ColumnSettingsDropdown<T>({
  open,
  onClose,
  columns,
  columnState,
  onColumnStateChange,
  onReset,
}: ColumnSettingsDropdownProps<T>) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div ref={panelRef} className="absolute end-0 top-full z-50 mt-2 w-80">
      <ColumnSettingsPanel
        columns={columns}
        columnState={columnState}
        onColumnStateChange={onColumnStateChange}
        onReset={onReset}
        onClose={onClose}
      />
    </div>
  );
}
