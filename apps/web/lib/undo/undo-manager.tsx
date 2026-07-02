'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { UndoToast } from '@/components/undo/undo-toast';
import { UNDO_WINDOW_MS } from '@/lib/undo/config';

export type UndoEntryMetadata = {
  action: string;
  entityIds?: string[];
};

export type UndoEntry = {
  id: string;
  message: string;
  expiresAt: number;
  onUndo: () => Promise<void>;
  metadata?: UndoEntryMetadata;
};

export type OfferUndoInput = Omit<UndoEntry, 'id' | 'expiresAt'>;

type UndoManagerContextValue = {
  offerUndo: (entry: OfferUndoInput) => void;
  dismissUndo: (id: string) => void;
  executeUndo: (id: string) => Promise<void>;
  activeUndo: UndoEntry | null;
  undoWindowMs: number;
  isExecuting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  clearFeedback: () => void;
};

const UndoManagerContext = createContext<UndoManagerContextValue | null>(null);

function createBrowserId(): string {
  return crypto.randomUUID();
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [activeUndo, setActiveUndo] = useState<UndoEntry | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(
    (id: string) => {
      setActiveUndo((current) => {
        if (current?.id === id) {
          clearDismissTimer();
          return null;
        }
        return current;
      });
    },
    [clearDismissTimer],
  );

  const scheduleDismiss = useCallback(
    (entry: UndoEntry) => {
      clearDismissTimer();
      const remaining = entry.expiresAt - Date.now();
      if (remaining <= 0) {
        dismissUndo(entry.id);
        return;
      }
      dismissTimerRef.current = setTimeout(() => {
        dismissUndo(entry.id);
      }, remaining);
    },
    [clearDismissTimer, dismissUndo],
  );

  const offerUndo = useCallback(
    (entry: OfferUndoInput) => {
      const next: UndoEntry = {
        ...entry,
        id: createBrowserId(),
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      };
      setActiveUndo((current) => {
        if (current) {
          clearDismissTimer();
        }
        return next;
      });
      scheduleDismiss(next);
    },
    [clearDismissTimer, scheduleDismiss],
  );

  const executeUndo = useCallback(
    async (id: string) => {
      const entry = activeUndo;
      if (!entry || entry.id !== id || isExecuting) {
        return;
      }
      if (Date.now() > entry.expiresAt) {
        dismissUndo(id);
        setFeedback({ type: 'error', message: 'مهلت بازگردانی به پایان رسید.' });
        return;
      }

      setIsExecuting(true);
      try {
        await entry.onUndo();
        dismissUndo(id);
        setFeedback({ type: 'success', message: 'بازگردانی انجام شد.' });
      } catch {
        setFeedback({ type: 'error', message: 'بازگردانی ممکن نبود.' });
      } finally {
        setIsExecuting(false);
      }
    },
    [activeUndo, dismissUndo, isExecuting],
  );

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    return () => clearDismissTimer();
  }, [clearDismissTimer]);

  const value = useMemo<UndoManagerContextValue>(
    () => ({
      offerUndo,
      dismissUndo,
      executeUndo,
      activeUndo,
      undoWindowMs: UNDO_WINDOW_MS,
      isExecuting,
      feedback,
      clearFeedback,
    }),
    [activeUndo, clearFeedback, dismissUndo, executeUndo, feedback, isExecuting, offerUndo],
  );

  return (
    <UndoManagerContext.Provider value={value}>
      {children}
      <UndoToast />
    </UndoManagerContext.Provider>
  );
}

export function useUndoManager(): UndoManagerContextValue {
  const context = useContext(UndoManagerContext);
  if (!context) {
    throw new Error('useUndoManager must be used within UndoProvider');
  }
  return context;
}
