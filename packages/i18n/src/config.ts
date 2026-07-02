import type { AppLocale } from './locales.js';
import { DEFAULT_APP_LOCALE, toBcp47Locale } from './locales.js';
import { TIMEZONE } from './locale.js';

export type CalendarSystem = 'jalali' | 'gregorian';

export const CALENDAR_STORAGE_KEY = 'hivork-calendar' as const;

export function defaultCalendarForLocale(locale: AppLocale): CalendarSystem {
  return locale === 'fa' ? 'jalali' : 'gregorian';
}

export function resolveCalendarPreference(
  locale: AppLocale,
  candidate: string | null | undefined,
): CalendarSystem {
  if (candidate === 'jalali' || candidate === 'gregorian') {
    return candidate;
  }
  return defaultCalendarForLocale(locale);
}

export function getTenantTimezone(tenantTimezone?: string | null): string {
  return tenantTimezone?.trim() || TIMEZONE;
}

export function getIntlLocale(locale: AppLocale = DEFAULT_APP_LOCALE): string {
  return toBcp47Locale(locale);
}
