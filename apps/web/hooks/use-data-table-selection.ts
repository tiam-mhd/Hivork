'use client';

import type { RowSelectionState } from '@hivork/contracts/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { countSelected } from '@/lib/data-table/selection-utils';

export type UseDataTableSelectionOptions = {
  /** Changes when filters/search change — clears selection (not sort). */
  resetKey: string;
  onSelectionCleared?: () => void;
};

export type UseDataTableSelectionResult = {
  rowSelection: RowSelectionState;
  setRowSelection: (state: RowSelectionState) => void;
  clearSelection: () => void;
};

export function useDataTableSelection({
  resetKey,
  onSelectionCleared,
}: UseDataTableSelectionOptions): UseDataTableSelectionResult {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const resetKeyRef = useRef(resetKey);
  const selectionRef = useRef(rowSelection);
  selectionRef.current = rowSelection;

  useEffect(() => {
    if (resetKeyRef.current === resetKey) {
      return;
    }

    resetKeyRef.current = resetKey;
    if (countSelected(selectionRef.current) > 0) {
      setRowSelection({});
      onSelectionCleared?.();
    }
  }, [resetKey, onSelectionCleared]);

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  return {
    rowSelection,
    setRowSelection,
    clearSelection,
  };
}

/** @deprecated Prefer `useDataTableSelection` — kept for task traceability. */
export function useClearRowSelectionOnFilterChange(
  filterKey: string,
  rowSelection: RowSelectionState,
  onRowSelectionChange: (state: RowSelectionState) => void,
  onCleared?: () => void,
): void {
  const filterKeyRef = useRef(filterKey);
  const selectionRef = useRef(rowSelection);
  selectionRef.current = rowSelection;

  useEffect(() => {
    if (filterKeyRef.current === filterKey) {
      return;
    }

    filterKeyRef.current = filterKey;
    if (countSelected(selectionRef.current) > 0) {
      onRowSelectionChange({});
      onCleared?.();
    }
  }, [filterKey, onCleared, onRowSelectionChange]);
}
