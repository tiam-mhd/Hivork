'use client';

import type { ColumnPersonalization } from '@hivork/contracts/ui';
import { Button } from '@hivork/ui';
import { useCallback, useState } from 'react';

import { ColumnSettingsDrawer } from './column-settings-drawer';
import { ColumnSettingsDropdown } from './column-settings-dropdown';
import type { DataTableColumnDef } from './types';

type ColumnSettingsTriggerProps<T> = {
  columns: DataTableColumnDef<T>[];
  columnState: ColumnPersonalization;
  onColumnStateChange: (state: ColumnPersonalization) => void;
  onReset: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ColumnSettingsTrigger<T>({
  columns,
  columnState,
  onColumnStateChange,
  onReset,
  open: controlledOpen,
  onOpenChange,
}: ColumnSettingsTriggerProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (onOpenChange) {
        onOpenChange(next);
      } else {
        setInternalOpen(next);
      }
    },
    [onOpenChange],
  );

  const handleOpen = useCallback(() => setOpen(true), [setOpen]);
  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  const handleReset = useCallback(() => {
    onReset();
    setOpen(false);
  }, [onReset, setOpen]);

  return (
    <div className="relative shrink-0">
      <Button type="button" variant="outline" size="sm" onClick={handleOpen} aria-expanded={open}>
        ستون‌ها
      </Button>

      <div className="hidden md:block">
        <ColumnSettingsDropdown
          open={open}
          onClose={handleClose}
          columns={columns}
          columnState={columnState}
          onColumnStateChange={onColumnStateChange}
          onReset={handleReset}
        />
      </div>

      <ColumnSettingsDrawer
        open={open}
        onClose={handleClose}
        columns={columns}
        columnState={columnState}
        onColumnStateChange={onColumnStateChange}
        onReset={handleReset}
      />
    </div>
  );
}
