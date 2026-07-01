'use client';

import { cn } from '@hivork/ui';

export type LoginTab = 'otp' | 'password';

type LoginTabsProps = {
  value: LoginTab;
  onChange: (tab: LoginTab) => void;
  disabled?: boolean;
};

export function LoginTabs({ value, onChange, disabled = false }: LoginTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="روش ورود"
      className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1"
    >
      <button
        type="button"
        role="tab"
        id="login-tab-otp"
        aria-selected={value === 'otp'}
        aria-controls="login-panel-otp"
        disabled={disabled}
        className={cn(
          'min-h-10 rounded-md px-3 text-sm font-medium transition-colors',
          value === 'otp'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onChange('otp')}
      >
        کد یکبارمصرف
      </button>
      <button
        type="button"
        role="tab"
        id="login-tab-password"
        aria-selected={value === 'password'}
        aria-controls="login-panel-password"
        disabled={disabled}
        className={cn(
          'min-h-10 rounded-md px-3 text-sm font-medium transition-colors',
          value === 'password'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onChange('password')}
      >
        رمز عبور
      </button>
    </div>
  );
}
