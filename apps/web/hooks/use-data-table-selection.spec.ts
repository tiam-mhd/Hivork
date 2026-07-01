import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDataTableSelection } from './use-data-table-selection';

describe('useDataTableSelection', () => {
  it('clears selection when filter reset key changes', () => {
    const onCleared = vi.fn();
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        useDataTableSelection({
          resetKey,
          onSelectionCleared: onCleared,
        }),
      { initialProps: { resetKey: 'a' } },
    );

    act(() => {
      result.current.setRowSelection({ row1: true });
    });
    expect(result.current.rowSelection).toEqual({ row1: true });

    rerender({ resetKey: 'b' });

    expect(result.current.rowSelection).toEqual({});
    expect(onCleared).toHaveBeenCalledTimes(1);
  });
});
