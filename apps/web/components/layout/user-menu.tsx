'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type UserMenuProps = {
  staffName: string;
  onLogout: () => Promise<void>;
};

export function UserMenu({ staffName, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
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

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  }

  const initial = staffName.trim().slice(0, 1) || '؟';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-10 min-w-10 items-center gap-2 rounded-md border border-header-border px-2 hover:bg-header-menu-hover"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
        >
          {initial}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm sm:inline">{staffName}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-48 rounded-md border border-border bg-card py-1 shadow-lg"
        >
          <p className="px-3 py-2 text-sm font-medium">{staffName}</p>
          <Link
            href="/admin/settings/appearance"
            role="menuitem"
            className="block w-full px-3 py-2 text-start text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => setOpen(false)}
          >
            ظاهر و تم
          </Link>
          <Button
            type="button"
            variant="ghost"
            role="menuitem"
            className="h-auto w-full justify-start rounded-none px-3 py-2 text-sm text-destructive hover:text-destructive"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            {loggingOut ? 'در حال خروج…' : 'خروج'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
