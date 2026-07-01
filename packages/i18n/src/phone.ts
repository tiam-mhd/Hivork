const MOBILE_PATTERN = /^09\d{9}$/;

import { toWesternDigits } from './digits.js';

/** Display format for normalized mobile numbers: `0912 345 6789`. */
export function formatPhoneDisplay(phone: string): string {
  const digits = toWesternDigits(phone).replace(/\D/g, '');

  if (!MOBILE_PATTERN.test(digits)) {
    return phone;
  }

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Normalizes phone input to Western digits (no validation). */
export function normalizePhoneDigits(raw: string): string {
  return toWesternDigits(raw).replace(/\D/g, '');
}
