import type { AppLocale } from '../locales.js';
import en from './en.json';
import fa from './fa.json';

const catalogs = {
  fa,
  en,
} as const;

export type SharedMessages = typeof fa;

export function getSharedMessages(locale: AppLocale): SharedMessages {
  return catalogs[locale] ?? catalogs.fa;
}

export function mergeMessages<T extends Record<string, unknown>>(
  base: SharedMessages,
  override: T,
): SharedMessages & T {
  return { ...base, ...override };
}
