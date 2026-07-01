'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button, Input, Label } from '@hivork/ui';
import { useId, type ReactNode } from 'react';

import {
  OVERDUE_ESCALATION_DAY_OPTIONS,
  REMINDER_CHANNEL_OPTIONS,
  REMINDER_DAYS_BEFORE_OPTIONS,
  type RemindersFieldErrors,
  type RemindersSettingsFormValues,
} from '@/lib/settings/reminders-settings.schema';

type RemindersSettingsFormProps = {
  values: RemindersSettingsFormValues;
  fieldErrors?: RemindersFieldErrors;
  disabled?: boolean;
  saving?: boolean;
  isDirty?: boolean;
  onChange: (next: RemindersSettingsFormValues) => void;
  onSubmit: () => void;
  onReset: () => void;
};

type FieldProps = {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

function FormField({ label, htmlFor, help, error, required, children }: FieldProps) {
  const helpId = `${htmlFor}-help`;
  const errorId = `${htmlFor}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      {children}
      {help ? (
        <p id={helpId} className="text-xs text-neutral-500">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {describedBy ? (
        <span className="sr-only" id={`${htmlFor}-desc`}>
          {describedBy}
        </span>
      ) : null}
    </div>
  );
}

function toggleDay(
  selected: number[],
  day: number,
  sort: 'asc' | 'desc',
): number[] {
  const next = selected.includes(day)
    ? selected.filter((value) => value !== day)
    : [...selected, day];

  return sort === 'desc'
    ? [...next].sort((a, b) => b - a)
    : [...next].sort((a, b) => a - b);
}

function toggleChannel(
  selected: RemindersSettingsFormValues['default_reminder_channels'],
  channel: (typeof REMINDER_CHANNEL_OPTIONS)[number]['value'],
): RemindersSettingsFormValues['default_reminder_channels'] {
  if (selected.includes(channel)) {
    return selected.filter((value: (typeof selected)[number]) => value !== channel);
  }
  return [...selected, channel];
}

export function RemindersSettingsForm({
  values,
  fieldErrors = {},
  disabled = false,
  saving = false,
  isDirty = false,
  onChange,
  onSubmit,
  onReset,
}: RemindersSettingsFormProps) {
  const formId = useId();
  const showSmsInfo = values.default_reminder_channels.includes('sms');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <FormField
        label="روزهای قبل از سررسید"
        htmlFor={`${formId}-days-before`}
        help="چند روز قبل از سررسید پیام ارسال شود."
        error={fieldErrors.reminder_days_before}
        required
      >
        <fieldset
          id={`${formId}-days-before`}
          className="flex flex-wrap gap-2"
          disabled={disabled || saving}
        >
          <legend className="sr-only">روزهای قبل از سررسید</legend>
          {REMINDER_DAYS_BEFORE_OPTIONS.map((day) => {
            const checked = values.reminder_days_before.includes(day);
            return (
              <label
                key={day}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  checked
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 bg-white text-neutral-800'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...values,
                      reminder_days_before: toggleDay(values.reminder_days_before, day, 'desc'),
                    })
                  }
                />
                {day === 0 ? 'روز سررسید' : `${formatPersianDigits(day)} روز قبل`}
              </label>
            );
          })}
        </fieldset>
      </FormField>

      <FormField
        label="ارسال در روز سررسید"
        htmlFor={`${formId}-on-due-date`}
        help="در صورت فعال بودن، در خود روز سررسید نیز یادآور ارسال می‌شود."
      >
        <label className="flex cursor-pointer items-center gap-3">
          <input
            id={`${formId}-on-due-date`}
            type="checkbox"
            role="switch"
            checked={values.reminder_on_due_date}
            disabled={disabled || saving}
            onChange={(event) =>
              onChange({ ...values, reminder_on_due_date: event.target.checked })
            }
            className="size-5 rounded border-neutral-300"
          />
          <span className="text-sm text-neutral-800">
            {values.reminder_on_due_date ? 'فعال' : 'غیرفعال'}
          </span>
        </label>
      </FormField>

      <FormField
        label="روزهای بعد از سررسید (معوق)"
        htmlFor={`${formId}-overdue-days`}
        help="چند روز پس از معوق شدن، پیام پیگیری ارسال شود."
        error={fieldErrors.overdue_escalation_days}
        required
      >
        <fieldset
          id={`${formId}-overdue-days`}
          className="flex flex-wrap gap-2"
          disabled={disabled || saving}
        >
          <legend className="sr-only">روزهای بعد از سررسید</legend>
          {OVERDUE_ESCALATION_DAY_OPTIONS.map((day) => {
            const checked = values.overdue_escalation_days.includes(day);
            return (
              <label
                key={day}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  checked
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 bg-white text-neutral-800'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...values,
                      overdue_escalation_days: toggleDay(
                        values.overdue_escalation_days,
                        day,
                        'asc',
                      ),
                    })
                  }
                />
                {formatPersianDigits(day)} روز بعد
              </label>
            );
          })}
        </fieldset>
      </FormField>

      <FormField
        label="ساعت ارسال"
        htmlFor={`${formId}-reminder-time`}
        help="ساعت ارسال یادآور بر اساس منطقه زمانی تهران."
        error={fieldErrors.reminder_time}
        required
      >
        <Input
          id={`${formId}-reminder-time`}
          type="time"
          dir="ltr"
          className="max-w-xs text-start"
          placeholder="09:00"
          value={values.reminder_time}
          disabled={disabled || saving}
          aria-invalid={Boolean(fieldErrors.reminder_time)}
          onChange={(event) => onChange({ ...values, reminder_time: event.target.value })}
        />
      </FormField>

      <FormField
        label="کانال‌های یادآور"
        htmlFor={`${formId}-channels`}
        help="کانال‌های پیش‌فرض ارسال یادآور به مشتری."
        error={fieldErrors.default_reminder_channels}
        required
      >
        <fieldset
          id={`${formId}-channels`}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          disabled={disabled || saving}
        >
          <legend className="sr-only">کانال‌های یادآور</legend>
          {REMINDER_CHANNEL_OPTIONS.map((channel) => {
            const checked = values.default_reminder_channels.includes(channel.value);
            return (
              <label
                key={channel.value}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  checked
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...values,
                      default_reminder_channels: toggleChannel(
                        values.default_reminder_channels,
                        channel.value,
                      ),
                    })
                  }
                  className="size-4 rounded border-neutral-300"
                />
                <span>{channel.label}</span>
              </label>
            );
          })}
        </fieldset>
        {showSmsInfo ? (
          <p className="text-xs text-amber-700">کانال SMS در Phase 2 فعال می‌شود.</p>
        ) : null}
      </FormField>

      <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
        <Button type="submit" disabled={disabled || saving || !isDirty}>
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || saving || !isDirty}
          onClick={onReset}
        >
          بازنشانی
        </Button>
      </div>
    </form>
  );
}

export function RemindersSettingsFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="در حال بارگذاری تنظیمات">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 w-full max-w-md animate-pulse rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
