'use client';

import { Input, Label } from '@hivork/ui';
import { useId, type ReactNode } from 'react';

type PasswordFieldGroupProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  autoComplete?: string;
  help?: string;
  error?: string;
  disabled?: boolean;
};

export function PasswordFieldGroup({
  label,
  value,
  onChange,
  showPassword,
  autoComplete,
  help,
  error,
  disabled,
}: PasswordFieldGroupProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={[helpId, errorId].filter(Boolean).join(' ') || undefined}
      />
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ShowPasswordToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      نمایش رمز عبور
    </label>
  );
}

export function SecurityFormActions({
  submitLabel,
  loading,
  disabled,
  onSubmit,
  secondary,
}: {
  submitLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={disabled || loading}
        onClick={onSubmit}
      >
        {loading ? 'در حال ذخیره…' : submitLabel}
      </button>
      {secondary}
    </div>
  );
}
