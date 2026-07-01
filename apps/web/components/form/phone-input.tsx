'use client';

import { phoneSchema } from '@hivork/contracts';
import { FA_FORM } from '@hivork/i18n';
import { Input, Label } from '@hivork/ui';
import { useId, useState } from 'react';

import { formatPhoneDisplay, normalizePhoneDigits } from '@/lib/i18n';

export type PhoneInputProps = {
  value: string;
  onChange: (phone: string) => void;
  label: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  id?: string;
};

export function PhoneInput({
  value,
  onChange,
  label,
  helpText = 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
  placeholder = 'مثال: ۰۹۱۲۱۲۳۴۵۶۷',
  disabled = false,
  error,
  required = false,
  id,
}: PhoneInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const [localError, setLocalError] = useState<string | null>(null);

  const describedBy = [helpText ? helpId : null, error || localError ? errorId : null]
    .filter(Boolean)
    .join(' ');

  function handleBlur() {
    const digits = normalizePhoneDigits(value);
    const parsed = phoneSchema.safeParse(digits);
    if (!parsed.success) {
      setLocalError(FA_FORM.INVALID_PHONE);
      return;
    }
    setLocalError(null);
    onChange(parsed.data);
  }

  const displayValue = value ? formatPhoneDisplay(value) : value;
  const fieldError = error ?? localError ?? undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>

      <Input
        id={inputId}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        dir="ltr"
        className="min-h-11 text-start"
        aria-label={label}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(fieldError)}
        placeholder={placeholder}
        disabled={disabled}
        value={displayValue}
        onChange={(event) => {
          setLocalError(null);
          onChange(normalizePhoneDigits(event.target.value));
        }}
        onBlur={handleBlur}
      />

      {helpText ? (
        <p id={helpId} className="text-xs text-neutral-500">
          {helpText}
        </p>
      ) : null}

      {fieldError ? (
        <p id={errorId} className="text-sm text-red-600">
          {fieldError}
        </p>
      ) : null}
    </div>
  );
}
