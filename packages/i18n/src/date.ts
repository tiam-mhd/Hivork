import { dayjs } from './dayjs.js';
import { toPersianDigits, toWesternDigits } from './digits.js';
import { LOCALE, TIMEZONE } from './locale.js';

const DAYJS_LOCALE = LOCALE.split('-')[0] ?? 'fa';

/** Formats a UTC instant as Jalali calendar date in Asia/Tehran. */
export function formatJalaliDate(date: Date): string {
  const formatted = dayjs(date).tz(TIMEZONE).calendar('jalali').locale(DAYJS_LOCALE).format('YYYY/MM/DD');
  return toPersianDigits(formatted);
}

/** ISO Gregorian date (YYYY-MM-DD) → Jalali display string. */
export function formatIsoDateAsJalali(isoDate: string): string {
  if (!isoDate.trim()) {
    return '';
  }
  const parsed = dayjs(isoDate, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) {
    return '';
  }
  return formatJalaliDate(parsed.toDate());
}

/** Parses Jalali date string (۱۴۰۵/۰۵/۰۱ or 1405/05/01) to Gregorian ISO date. */
export function parseJalaliDateToIso(jalaliDate: string): string | null {
  const normalized = toWesternDigits(jalaliDate).trim();
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = dayjs()
    .calendar('jalali')
    .year(year)
    .month(month - 1)
    .date(day)
    .hour(12)
    .minute(0)
    .second(0);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed.calendar('gregory').format('YYYY-MM-DD');
}

/** Gregorian ISO date for API from Date instance. */
export function toGregorianIsoDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}
