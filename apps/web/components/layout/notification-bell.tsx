'use client';

import { useEffect, useRef, useState } from 'react';

import { NotificationPanel } from '@/components/layout/notification-panel';
import { useRealtime } from '@/components/providers/realtime-provider';

export function NotificationBell() {
  const { unreadCount, markAllRead } = useRealtime();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      await markAllRead();
    }
  }

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="اعلان‌ها"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-md border border-header-border hover:bg-header-menu-hover"
        onClick={() => void handleOpen()}
      >
        <span aria-hidden className="text-lg leading-none">
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -start-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? <NotificationPanel onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
