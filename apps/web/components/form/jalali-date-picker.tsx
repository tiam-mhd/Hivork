'use client';

import { FA_FORM } from '@hivork/i18n';

import { DatePicker } from '@/components/date-picker';

export type JalaliDatePickerProps = {
  value?: string;
  onChange: (isoDate: string) => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  id?: string;
  compact?: boolean;
  showHelp?: boolean;
};

/** @deprecated Use DatePicker from `@/components/date-picker` */
export function JalaliDatePicker({
  value = '',
  onChange,
  label = 'تاریخ',
  error,
  ...props
}: JalaliDatePickerProps) {
  return (
    <DatePicker
      mode="single"
      calendar="jalali"
      value={value || undefined}
      onChange={(next) => {
        if (next) {
          onChange(next);
        }
      }}
      label={label}
      error={error ?? undefined}
      {...props}
    />
  );
}

export { FA_FORM };
