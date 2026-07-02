import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UndoProvider, useUndoManager } from '@/lib/undo/undo-manager';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function UndoProbe() {
  const { offerUndo, executeUndo, activeUndo } = useUndoManager();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          offerUndo({
            message: 'تست',
            onUndo: vi.fn().mockResolvedValue(undefined),
            metadata: { action: 'test.action' },
          })
        }
      >
        offer-once
      </button>
      {activeUndo ? (
        <button type="button" onClick={() => void executeUndo(activeUndo.id)}>
          run-undo
        </button>
      ) : null}
    </div>
  );
}

describe('UndoProvider', () => {
  it('expires undo after window', async () => {
    vi.useFakeTimers();

    render(
      <UndoProvider>
        <UndoProbe />
      </UndoProvider>,
    );

    fireEvent.click(screen.getByText('offer-once'));
    expect(screen.getByText('تست')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(10_500);
    });

    expect(screen.queryByText('تست')).toBeNull();
  });
});

describe('UndoToast undo execution', () => {
  it('calls onUndo once', async () => {
    const onUndo = vi.fn().mockResolvedValue(undefined);

    function Offerer() {
      const { offerUndo } = useUndoManager();
      return (
        <button
          type="button"
          onClick={() =>
            offerUndo({
              message: 'برچسب اضافه شد',
              onUndo,
              metadata: { action: 'customer.bulk_tag' },
            })
          }
        >
          offer-once
        </button>
      );
    }

    render(
      <UndoProvider>
        <Offerer />
      </UndoProvider>,
    );

    fireEvent.click(screen.getByText('offer-once'));
    fireEvent.click(screen.getByRole('button', { name: 'بازگردانی' }));

    await waitFor(() => {
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });
});
