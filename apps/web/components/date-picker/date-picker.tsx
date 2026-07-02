'use client';

import { compareIsoDateOnly, isoToDisplay, type CalendarSystem } from '@hivork/i18n';
import { Button, Input, Label, cn } from '@hivork/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

import { CalendarPanel } from './calendar-panel';

import { useCalendarPreference } from '@/hooks/use-calendar-preference';

export type DatePickerProps =
  | {
      mode?: 'single';
      value?: string;
      onChange: (value: string | undefined) => void;
      rangeValue?: never;
      onRangeChange?: never;
      calendar?: CalendarSystem;
      minDate?: string;
      maxDate?: string;
      disabled?: boolean;
      placeholder?: string;
      label?: string;
      helpText?: string;
      error?: string;
      required?: boolean;
      id?: string;
      compact?: boolean;
      showHelp?: boolean;
      showCalendarToggle?: boolean;
    }
  | {
      mode: 'range';
      value?: never;
      onChange?: never;
      rangeValue?: { from?: string; to?: string };
      onRangeChange?: (range: { from?: string; to?: string }) => void;
      calendar?: CalendarSystem;
      minDate?: string;
      maxDate?: string;
      disabled?: boolean;
      placeholder?: string;
      label?: string;
      helpText?: string;
      error?: string;
      required?: boolean;
      id?: string;
      compact?: boolean;
      showHelp?: boolean;
      showCalendarToggle?: boolean;
    };

export function DatePicker(props: DatePickerProps) {
  if (props.mode === 'range') {
    const {
      rangeValue,
      onRangeChange,
      calendar: calendarOverride,
      disabled,
      compact,
      showCalendarToggle = true,
    } = props;
    const tCalendar = useTranslations('calendar');
    const { calendar: preferredCalendar, toggleCalendar } = useCalendarPreference();
    const calendar = calendarOverride ?? preferredCalendar;

    return (
      <DateRangePicker
        rangeValue={rangeValue}
        onRangeChange={onRangeChange}
        calendar={calendar}
        disabled={disabled}
        compact={compact}
        showCalendarToggle={showCalendarToggle}
        onToggleCalendar={toggleCalendar}
        calendarLabel={calendar === 'jalali' ? tCalendar('gregorian') : tCalendar('jalali')}
      />
    );
  }

  const {
    value,
    onChange,
    calendar: calendarOverride,
    disabled = false,
    placeholder,
    label,
    helpText,
    error,
    required = false,
    id,
    compact = false,
    showHelp = true,
    showCalendarToggle = true,
  } = props;

  const locale = useLocale() as 'fa' | 'en';
  const t = useTranslations('datePicker');
  const tCalendar = useTranslations('calendar');
  const { calendar: preferredCalendar, setCalendar } = useCalendarPreference();
  const calendar = calendarOverride ?? preferredCalendar;

  return (
    <SingleDatePicker
      value={value}
      onChange={onChange}
      calendar={calendar}
      locale={locale}
      disabled={disabled}
      placeholder={placeholder ?? t('placeholder')}
      label={label}
      helpText={helpText ?? (calendar === 'jalali' ? t('helpJalali') : t('helpGregorian'))}
      error={error}
      required={required}
      id={id}
      compact={compact}
      showHelp={showHelp}
      showCalendarToggle={showCalendarToggle}
      onToggleCalendar={() => setCalendar(calendar === 'jalali' ? 'gregorian' : 'jalali')}
      calendarLabel={calendar === 'jalali' ? tCalendar('gregorian') : tCalendar('jalali')}
    />
  );
}

type SingleDatePickerProps = {
  value?: string;
  onChange: (value: string | undefined) => void;
  calendar: CalendarSystem;
  locale: 'fa' | 'en';
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  id?: string;
  compact?: boolean;
  showHelp?: boolean;
  showCalendarToggle?: boolean;
  onToggleCalendar?: () => void;
  calendarLabel?: string;
};

function SingleDatePicker({
  value,
  onChange,
  calendar,
  locale,
  disabled = false,
  placeholder,
  label,
  helpText,
  error,
  required = false,
  id,
  compact = false,
  showHelp = true,
  showCalendarToggle = true,
  onToggleCalendar,
  calendarLabel,
}: SingleDatePickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const displayValue = value ? isoToDisplay(value, calendar, locale) : '';

  useEffect(() => {
    if (!open) {
      return;
    }
    const dialog = dialogRef.current;
    dialog?.showModal();
  }, [open]);

  const describedBy = [helpText && showHelp ? helpId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <Label htmlFor={inputId}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}

      <div className={compact ? 'relative' : 'flex gap-2'}>
        <Input
          id={inputId}
          readOnly
          value={displayValue}
          placeholder={placeholder}
          className={cn(
            compact ? 'min-h-10 w-full cursor-pointer pe-10 text-start' : 'min-h-11 flex-1 text-start',
          )}
          aria-label={label ?? placeholder}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
        />
        {compact ? (
          <button
            type="button"
            className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
            disabled={disabled}
            onClick={() => setOpen(true)}
            aria-label={placeholder}
          >
            <CalendarIcon />
          </button>
        ) : (
          <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={() => setOpen(true)}>
            {placeholder}
          </Button>
        )}
      </div>

      {showCalendarToggle && onToggleCalendar ? (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={onToggleCalendar}
        >
          {calendarLabel}
        </button>
      ) : null}

      <dialog
        ref={dialogRef}
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg backdrop:bg-black/40"
        onClose={() => setOpen(false)}
      >
        <CalendarPanel
          calendar={calendar}
          value={value}
          onSelect={(iso) => onChange(iso)}
          onClose={() => {
            dialogRef.current?.close();
            setOpen(false);
          }}
        />
      </dialog>

      {showHelp && helpText ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type DateRangePickerProps = {
  rangeValue?: { from?: string; to?: string };
  onRangeChange?: (range: { from?: string; to?: string }) => void;
  calendar: CalendarSystem;
  disabled?: boolean;
  compact?: boolean;
  showCalendarToggle?: boolean;
  onToggleCalendar?: () => void;
  calendarLabel?: string;
};

function DateRangePicker({
  rangeValue,
  onRangeChange,
  calendar,
  disabled,
  compact,
  showCalendarToggle,
  onToggleCalendar,
  calendarLabel,
}: DateRangePickerProps) {
  const t = useTranslations('datePicker');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const from = rangeValue?.from;
  const to = rangeValue?.to;

  useEffect(() => {
    if (from && to && compareIsoDateOnly(from, to) > 0) {
      setRangeError(t('rangeInvalid'));
      return;
    }
    setRangeError(null);
  }, [from, to, t]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <DatePicker
          mode="single"
          value={from}
          onChange={(next) => onRangeChange?.({ ...rangeValue, from: next })}
          calendar={calendar}
          disabled={disabled}
          compact={compact}
          label={t('fromLabel')}
          showCalendarToggle={false}
          showHelp={false}
        />
        <DatePicker
          mode="single"
          value={to}
          onChange={(next) => onRangeChange?.({ ...rangeValue, to: next })}
          calendar={calendar}
          disabled={disabled}
          compact={compact}
          label={t('toLabel')}
          showCalendarToggle={false}
          showHelp={false}
        />
      </div>
      {showCalendarToggle && onToggleCalendar ? (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={onToggleCalendar}
        >
          {calendarLabel}
        </button>
      ) : null}
      {rangeError ? <p className="text-sm text-destructive">{rangeError}</p> : null}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
