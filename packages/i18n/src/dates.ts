import { dayjs } from './dayjs.js';
import { toPersianDigits, toWesternDigits } from './digits.js';
import type { CalendarSystem } from './config.js';
import { getIntlLocale } from './config.js';
import type { AppLocale } from './locales.js';
import { DEFAULT_APP_LOCALE } from './locales.js';
import { LOCALE, TIMEZONE } from './locale.js';

const DAYJS_LOCALE = LOCALE.split('-')[0] ?? 'fa';

/** Parses ISO date-only (YYYY-MM-DD) as UTC midnight. */
export function parseIsoDateOnly(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = dayjs.utc(trimmed, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) {
    return null;
  }

  return parsed.toDate();
}

export function isValidIsoDateOnly(iso: string): boolean {
  return parseIsoDateOnly(iso) !== null;
}

export function compareIsoDateOnly(a: string, b: string): number {
  const left = parseIsoDateOnly(a);
  const right = parseIsoDateOnly(b);
  if (!left || !right) {
    return 0;
  }
  return left.getTime() - right.getTime();
}

/** Formats a UTC instant as Jalali calendar date in Asia/Tehran. */
export function formatJalaliDate(date: Date): string {
  const formatted = dayjs(date).tz(TIMEZONE).calendar('jalali').locale(DAYJS_LOCALE).format('YYYY/MM/DD');
  return toPersianDigits(formatted);
}

/** ISO Gregorian date (YYYY-MM-DD) → Jalali display string. */
export function formatIsoDateAsJalali(isoDate: string): string {
  return isoToJalaliDisplay(isoDate, DEFAULT_APP_LOCALE, { persianDigits: true });
}

/** ISO date-only → display string for the active calendar system. */
export function isoToDisplay(
  iso: string,
  calendar: CalendarSystem,
  locale: AppLocale = DEFAULT_APP_LOCALE,
  options?: { persianDigits?: boolean },
): string {
  if (calendar === 'jalali') {
    return isoToJalaliDisplay(iso, locale, options);
  }
  return isoToGregorianDisplay(iso, locale);
}

export function isoToJalaliDisplay(
  iso: string,
  locale: AppLocale = DEFAULT_APP_LOCALE,
  options?: { persianDigits?: boolean },
): string {
  if (!iso.trim()) {
    return '';
  }

  const parsed = parseIsoDateOnly(iso);
  if (!parsed) {
    return '';
  }

  const formatted = dayjs(parsed)
    .tz(TIMEZONE)
    .calendar('jalali')
    .locale(locale === 'fa' ? 'fa' : 'en')
    .format('YYYY/MM/DD');

  const usePersianDigits = options?.persianDigits ?? locale === 'fa';
  return usePersianDigits ? toPersianDigits(formatted) : formatted;
}

export function isoToGregorianDisplay(iso: string, locale: AppLocale = DEFAULT_APP_LOCALE): string {
  if (!iso.trim()) {
    return '';
  }

  const parsed = parseIsoDateOnly(iso);
  if (!parsed) {
    return '';
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

/** Parses Jalali date string (۱۴۰۵/۰۵/۰۱ or 1405/05/01) to Gregorian ISO date. */
export function parseJalaliDateToIso(jalaliDate: string): string | null {
  const normalized = toWesternDigits(jalaliDate).trim();
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) {
    return null;
  }

  return jalaliInputToIso(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function jalaliInputToIso(jy: number, jm: number, jd: number): string | null {
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) {
    return null;
  }

  const parsed = dayjs()
    .calendar('jalali')
    .year(jy)
    .month(jm - 1)
    .date(jd)
    .hour(12)
    .minute(0)
    .second(0);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed.calendar('gregory').format('YYYY-MM-DD');
}

export function gregorianInputToIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsed = dayjs()
    .year(year)
    .month(month - 1)
    .date(day)
    .hour(12)
    .minute(0)
    .second(0);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed.format('YYYY-MM-DD');
}

/** Gregorian ISO date for API from Date instance. */
export function toGregorianIsoDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function getJalaliPartsFromIso(iso: string): { year: number; month: number; day: number } | null {
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) {
    return null;
  }

  const jalali = dayjs(parsed).tz(TIMEZONE).calendar('jalali');
  return {
    year: jalali.year(),
    month: jalali.month() + 1,
    day: jalali.date(),
  };
}

export function getGregorianPartsFromIso(iso: string): { year: number; month: number; day: number } | null {
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) {
    return null;
  }

  const g = dayjs(parsed).tz(TIMEZONE);
  return {
    year: g.year(),
    month: g.month() + 1,
    day: g.date(),
  };
}
