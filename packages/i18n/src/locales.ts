/** Supported UI locales — `fa` maps to fa-IR business rules. */
export const APP_LOCALES = ['fa', 'en'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'fa';

export const LOCALE_COOKIE_NAME = 'hivork-locale' as const;

export const LOCALE_STORAGE_KEY = 'hivork-locale' as const;

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'fa' || value === 'en';
}

export function resolveAppLocale(candidate: string | null | undefined): AppLocale {
  return isAppLocale(candidate) ? candidate : DEFAULT_APP_LOCALE;
}

/** BCP-47 tag for Intl APIs */
export function toBcp47Locale(locale: AppLocale): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US';
}
