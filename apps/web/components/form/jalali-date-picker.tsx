'use client';

import { FA_COMMON, FA_FORM } from '@hivork/i18n';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  formatIsoDateAsJalali,
  formatPersianDigits,
  parseJalaliDateToIso,
  toWesternDigits,
} from '@/lib/i18n';

const JALALI_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const CURRENT_JALALI_YEAR = 1405;

export type JalaliDatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  id?: string;
  /** Hides the secondary pick button — for compact filter toolbars */
  compact?: boolean;
  /** Show help text below the field */
  showHelp?: boolean;
};

export function JalaliDatePicker({
  value,
  onChange,
  label = 'تاریخ',
  helpText = FA_COMMON.DATE_HELP,
  placeholder = FA_COMMON.SELECT_DATE,
  disabled = false,
  error,
  required = false,
  id,
  compact = false,
  showHelp = true,
}: JalaliDatePickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const displayValue = value ? formatIsoDateAsJalali(value) : '';

  const initialParts = useMemo(() => parseDisplayToParts(displayValue), [displayValue]);
  const [year, setYear] = useState(initialParts.year);
  const [month, setMonth] = useState(initialParts.month);
  const [day, setDay] = useState(initialParts.day);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const parts = parseDisplayToParts(displayValue);
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
  }, [displayValue]);

  const years = useMemo(
    () => Array.from({ length: 11 }, (_, index) => CURRENT_JALALI_YEAR - 5 + index),
    [],
  );
  const days = useMemo(() => Array.from({ length: 31 }, (_, index) => index + 1), []);

  function openPicker() {
    if (disabled) {
      return;
    }
    dialogRef.current?.showModal();
  }

  function applySelection() {
    const iso = parseJalaliDateToIso(`${year}/${month}/${day}`);
    if (!iso) {
      setLocalError(FA_FORM.INVALID_DATE);
      return;
    }
    setLocalError(null);
    onChange(iso);
    dialogRef.current?.close();
  }

  const fieldError = error ?? localError ?? undefined;
  const describedBy = [helpText ? helpId : null, fieldError ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>

      <div className={compact ? 'relative' : 'flex gap-2'}>
        <Input
          id={inputId}
          readOnly
          value={displayValue}
          placeholder={placeholder}
          className={compact ? 'min-h-10 w-full cursor-pointer pe-10 text-start' : 'min-h-11 flex-1 text-start'}
          aria-label={label}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(fieldError)}
          disabled={disabled}
          onClick={openPicker}
        />
        {compact ? (
          <button
            type="button"
            className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
            disabled={disabled}
            onClick={openPicker}
            aria-label={FA_COMMON.SELECT_DATE}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
        ) : (
          <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={openPicker}>
            {FA_COMMON.SELECT_DATE}
          </Button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-3">
          <p className="font-medium">{FA_COMMON.SELECT_DATE}</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1 text-xs">
              سال
              <select
                className="min-h-10 rounded-md border border-neutral-300 px-2"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {formatPersianDigits(y)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              ماه
              <select
                className="min-h-10 rounded-md border border-neutral-300 px-2"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {JALALI_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {formatPersianDigits(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              روز
              <select
                className="min-h-10 rounded-md border border-neutral-300 px-2"
                value={day}
                onChange={(event) => setDay(Number(event.target.value))}
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {formatPersianDigits(d)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              انصراف
            </Button>
            <Button type="button" onClick={applySelection}>
              تأیید
            </Button>
          </div>
        </div>
      </dialog>

      {showHelp && helpText ? (
        <p id={helpId} className="text-xs text-muted-foreground">
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

function parseDisplayToParts(display: string): { year: number; month: number; day: number } {
  const western = toWesternDigits(display);
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(western);
  if (!match) {
    return { year: CURRENT_JALALI_YEAR, month: 1, day: 1 };
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}
