'use client';

import type { ThemeModePreference } from '@hivork/contracts/theme';
import { useThemeOptional } from '@hivork/theme/react';
import { Button, cn } from '@hivork/ui';
import { useEffect, useId, useRef, useState } from 'react';

import { themeModeLabel } from '@/hooks/use-tenant-theme-sync';

const MODES: ThemeModePreference[] = ['light', 'dark', 'system'];

function ThemeModeIcon({ mode, active }: { mode: ThemeModePreference; active: boolean }) {
  const className = cn('text-base leading-none', active ? 'text-primary-foreground' : 'text-muted-foreground');

  if (mode === 'light') {
    return (
      <span className={className} aria-hidden>
        ☀
      </span>
    );
  }

  if (mode === 'dark') {
    return (
      <span className={className} aria-hidden>
        ☾
      </span>
    );
  }

  return (
    <span className={className} aria-hidden>
      ◐
    </span>
  );
}

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeOptional();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!theme) {
    return null;
  }

  const { themeMode, setThemeMode } = theme;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="size-10 px-0"
        aria-label="تغییر تم"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <ThemeModeIcon mode={themeMode === 'system' ? 'system' : themeMode} active />
        <span className="sr-only">{themeModeLabel(themeMode)}</span>
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-50 mt-2 min-w-36 rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="menuitemradio"
              aria-checked={themeMode === mode}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors',
                themeMode === mode
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-muted',
              )}
              onClick={() => {
                setThemeMode(mode);
                setOpen(false);
              }}
            >
              <ThemeModeIcon mode={mode} active={themeMode === mode} />
              <span>{themeModeLabel(mode)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
