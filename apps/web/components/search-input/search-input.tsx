'use client';

import { Button, Input, Label } from '@hivork/ui';
import { useCallback, useEffect, useId, useState } from 'react';

import { shouldCommitSearchTerm } from '@/lib/search';

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  minLength?: number;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
};

export function SearchInput({
  value,
  onChange,
  debounceMs = 300,
  minLength = 2,
  placeholder = 'جستجو نام، موبایل، کد…',
  isLoading = false,
  disabled = false,
  id: idProp,
  'aria-label': ariaLabel = 'جستجو',
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) {
      return;
    }

    if (!shouldCommitSearchTerm(draft, minLength) && draft.trim().length > 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      onChange(draft.trim());
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, draft, minLength, onChange, value]);

  const handleClear = useCallback(() => {
    setDraft('');
    onChange('');
  }, [onChange]);

  const showClear = draft.length > 0 && !disabled;

  return (
    <div className="relative min-w-0 flex-1">
      <Label htmlFor={inputId} className="sr-only">
        {ariaLabel}
      </Label>
      <Input
        id={inputId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        inputMode="search"
        className="pe-16"
        aria-label={ariaLabel}
        aria-busy={isLoading}
      />

      <div className="pointer-events-none absolute inset-y-0 end-2 flex items-center gap-1">
        {isLoading ? (
          <span
            className="inline-flex size-5 items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        ) : (
          <span className="text-muted-foreground" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        )}

        {showClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="pointer-events-auto size-7 text-muted-foreground"
            onClick={handleClear}
            aria-label="پاک کردن جستجو"
          >
            ×
          </Button>
        ) : null}
      </div>
    </div>
  );
}
