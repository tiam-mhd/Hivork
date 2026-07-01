'use client';

import type { ThemeColorMode } from '@hivork/contracts/theme';
import { useThemeOptional } from '@hivork/theme/react';
import { cn } from '@hivork/ui';

type ColorModeToggleProps = {
  className?: string;
};

export function ColorModeToggle({ className }: ColorModeToggleProps) {
  const theme = useThemeOptional();

  if (!theme) {
    return null;
  }

  const { colorMode, setColorMode } = theme;

  return (
    <div
      className={cn('inline-flex rounded-md border border-header-border bg-card/80 p-0.5', className)}
      role="group"
      aria-label="حالت رنگ"
    >
      {(['light', 'dark'] as const).map((mode: ThemeColorMode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={colorMode === mode}
          title={mode === 'light' ? 'حالت روشن' : 'حالت تاریک'}
          onClick={() => setColorMode(mode)}
          className={cn(
            'flex size-9 items-center justify-center rounded text-sm transition-colors',
            colorMode === mode
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
