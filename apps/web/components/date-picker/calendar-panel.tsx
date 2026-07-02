'use client';

import {
  formatPersianDigits,
  getGregorianPartsFromIso,
  getJalaliPartsFromIso,
  gregorianInputToIso,
  jalaliInputToIso,
  type CalendarSystem,
} from '@hivork/i18n';
import { Button } from '@hivork/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type CalendarPanelProps = {
  calendar: CalendarSystem;
  value?: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  minDate?: string;
  maxDate?: string;
};

const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const GREGORIAN_MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function currentParts(calendar: CalendarSystem, value?: string) {
  if (value) {
    const parts =
      calendar === 'jalali' ? getJalaliPartsFromIso(value) : getGregorianPartsFromIso(value);
    if (parts) {
      return parts;
    }
  }

  if (calendar === 'jalali') {
    return getJalaliPartsFromIso(new Date().toISOString().slice(0, 10)) ?? { year: 1405, month: 1, day: 1 };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function formatDigit(value: number, locale: 'fa' | 'en', calendar: CalendarSystem): string {
  const text = String(value);
  return locale === 'fa' && calendar === 'jalali' ? formatPersianDigits(text) : text;
}

export function CalendarPanel({
  calendar,
  value,
  onSelect,
  onClose,
}: CalendarPanelProps) {
  const t = useTranslations('calendar');
  const tCommon = useTranslations('common');
  const tDate = useTranslations('datePicker');
  const initial = currentParts(calendar, value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(
    () => Array.from({ length: 11 }, (_, index) => initial.year - 5 + index),
    [initial.year],
  );
  const days = useMemo(() => Array.from({ length: 31 }, (_, index) => index + 1), []);
  const locale = calendar === 'jalali' ? 'fa' : 'en';

  function apply() {
    const iso =
      calendar === 'jalali'
        ? jalaliInputToIso(year, month, day)
        : gregorianInputToIso(year, month, day);

    if (!iso) {
      setError(tDate('invalidDate'));
      return;
    }

    setError(null);
    onSelect(iso);
    onClose();
  }

  const monthLabel = (monthIndex: number) =>
    calendar === 'jalali'
      ? JALALI_MONTHS_FA[monthIndex - 1]
      : GREGORIAN_MONTHS_EN[monthIndex - 1];

  return (
    <div className="flex flex-col gap-3" dir={calendar === 'jalali' ? 'rtl' : 'ltr'}>
      <p className="font-medium text-foreground">
        {calendar === 'jalali' ? t('jalali') : t('gregorian')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('year')}
          <select
            className="min-h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {formatDigit(y, locale, calendar)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('month')}
          <select
            className="min-h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('day')}
          <select
            className="min-h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDigit(d, locale, calendar)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon('cancel')}
        </Button>
        <Button type="button" onClick={apply}>
          {tCommon('confirm')}
        </Button>
      </div>
    </div>
  );
}
