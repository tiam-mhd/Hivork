'use client';

import { FA_COMMON, FA_FORM } from '@hivork/i18n';
import { Input, Label } from '@hivork/ui';
import { useEffect, useId, useState } from 'react';

import {
  formatRialStringAsTomanDisplay,
  parseTomanInputToRialString,
} from '@/lib/i18n';

export type TomanInputProps = {
  value: string;
  onChange: (rial: string) => void;
  label: string;
  helpText?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  id?: string;
};

export function TomanInput({
  value,
  onChange,
  label,
  helpText = FA_COMMON.TOMAN_HELP,
  disabled = false,
  error,
  required = false,
  id,
}: TomanInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  const [display, setDisplay] = useState(() => formatRialStringAsTomanDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(formatRialStringAsTomanDisplay(value));
    }
  }, [value, focused]);

  function handleBlur() {
    setFocused(false);
    try {
      const rial = parseTomanInputToRialString(display);
      onChange(rial);
      setDisplay(formatRialStringAsTomanDisplay(rial));
    } catch {
      if (required && !display.trim()) {
        onChange('0');
      }
    }
  }

  const describedBy = [helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>

      <div className="relative">
        <Input
          id={inputId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className="min-h-11 pe-16 text-start"
          aria-label={label}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          value={display}
          onChange={(event) => setDisplay(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
        />
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-neutral-500">
          {FA_COMMON.CURRENCY_TOMAN_SUFFIX}
        </span>
      </div>

      {helpText ? (
        <p id={helpId} className="text-xs text-neutral-500">
          {helpText}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {required && !display.trim() && !focused ? (
        <p className="sr-only">{FA_FORM.FIELD_REQUIRED}</p>
      ) : null}
    </div>
  );
}

export function validateTomanInputRequired(rial: string): string | undefined {
  if (!rial.trim() || rial === '0') {
    return FA_FORM.AMOUNT_REQUIRED;
  }
  return undefined;
}
