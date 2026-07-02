'use client';

import type { ThemeModePreference } from '@hivork/contracts/theme';
import { useThemeOptional } from '@hivork/theme/react';
import { cn } from '@hivork/ui';

import { ThemeToggle } from '@/components/layout/theme-toggle';

type ColorModeToggleProps = {
  className?: string;
};

/** @deprecated Use ThemeToggle */
export function ColorModeToggle({ className }: ColorModeToggleProps) {
  const theme = useThemeOptional();

  if (!theme) {
    return null;
  }

  const { themeMode, setThemeMode } = theme;

  return (
    <div
      className={cn('inline-flex rounded-md border border-header-border bg-card/80 p-0.5', className)}
      role="group"
      aria-label="حالت رنگ"
    >
      {(['light', 'dark'] as const satisfies ThemeModePreference[]).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={themeMode === mode}
          title={mode === 'light' ? 'حالت روشن' : 'حالت تاریک'}
          onClick={() => setThemeMode(mode)}
          className={cn(
            'flex size-9 items-center justify-center rounded text-sm transition-colors',
            themeMode === mode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-header-menu-hover hover:text-foreground',
          )}
        >
          <span aria-hidden>{mode === 'light' ? '☀' : '☾'}</span>
          <span className="sr-only">{mode === 'light' ? 'روشن' : 'تاریک'}</span>
        </button>
      ))}
    </div>
  );
}

export { ThemeToggle };
