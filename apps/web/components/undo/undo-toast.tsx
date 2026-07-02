'use client';

import { Button } from '@hivork/ui';
import { useEffect, useMemo, useState } from 'react';

import { useUndoManager } from '@/lib/undo/undo-manager';

function formatSecondsRemaining(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export function UndoToast() {
  const {
    activeUndo,
    dismissUndo,
    executeUndo,
    undoWindowMs,
    feedback,
    clearFeedback,
    isExecuting,
  } = useUndoManager();

  const [secondsLeft, setSecondsLeft] = useState(() =>
    activeUndo ? formatSecondsRemaining(activeUndo.expiresAt) : 0,
  );

  useEffect(() => {
    if (!activeUndo) {
      return;
    }

    setSecondsLeft(formatSecondsRemaining(activeUndo.expiresAt));
    const timer = window.setInterval(() => {
      const remaining = formatSecondsRemaining(activeUndo.expiresAt);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        dismissUndo(activeUndo.id);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [activeUndo, dismissUndo]);

  const showCountdown = useMemo(
    () => secondsLeft > 0 && secondsLeft <= undoWindowMs / 1000,
    [secondsLeft, undoWindowMs],
  );

  if (!activeUndo && !feedback) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-start gap-2 sm:inset-x-auto sm:start-4">
      {activeUndo ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg"
        >
          <span className="flex-1 text-foreground">{activeUndo.message}</span>
          {showCountdown ? (
            <span className="text-xs text-muted-foreground">({secondsLeft} ثانیه)</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isExecuting || secondsLeft <= 0}
            onClick={() => void executeUndo(activeUndo.id)}
          >
            {isExecuting ? 'در حال بازگردانی…' : 'بازگردانی'}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => dismissUndo(activeUndo.id)}
          >
            بستن
          </button>
        </div>
      ) : null}

      {feedback ? (
        <div
          role="alert"
          className={`pointer-events-auto w-full max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${
            feedback.type === 'success'
              ? 'border-banner-trial-border bg-banner-trial text-banner-trial-foreground'
              : 'border-banner-error-border bg-banner-error text-banner-error-foreground'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{feedback.message}</span>
            <button type="button" className="text-xs underline" onClick={clearFeedback}>
              بستن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
