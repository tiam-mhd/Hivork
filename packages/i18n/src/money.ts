import { CURRENCY_LABEL_TOMAN, LOCALE } from './locale.js';
import { formatPersianDigits, toWesternDigits } from './digits.js';

/** Maximum toman value accepted in UI inputs (before conversion to rial). */
export const MAX_TOMAN_INPUT = 900_000_000_000_000n;

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatToman(amountRial: bigint): string {
  if (amountRial < 0n) {
    throw new Error('amountRial cannot be negative');
  }
  const toman = amountRial / 10n;
  return `${numberFormatter.format(toman)} ${CURRENCY_LABEL_TOMAN}`;
}

/** Formats a toman bigint for editable display (Persian digits + grouping). */
export function formatTomanInputDisplay(toman: bigint): string {
  if (toman < 0n) {
    throw new Error('toman cannot be negative');
  }
  return formatPersianDigits(numberFormatter.format(toman));
}

/** Parses user toman input (Persian/Western digits, separators) to toman bigint. */
export function parseTomanInput(raw: string): bigint {
  const digits = toWesternDigits(raw).replace(/\D/g, '');
  if (!digits) {
    return 0n;
  }
  const toman = BigInt(digits);
  if (toman > MAX_TOMAN_INPUT) {
    throw new Error('AMOUNT_TOO_LARGE');
  }
  return toman;
}

/** Converts toman bigint to rial string for API payloads. */
export function toRialString(toman: bigint): string {
  if (toman < 0n) {
    throw new Error('toman cannot be negative');
  }
  return String(toman * 10n);
}

/** Parses toman input and returns rial as decimal string. */
export function parseTomanInputToRialString(raw: string): string {
  return toRialString(parseTomanInput(raw));
}

/** Formats rial string for toman input display. */
export function formatRialStringAsTomanDisplay(rial: string): string {
  if (!rial.trim()) {
    return '';
  }
  const amount = BigInt(rial);
  return formatTomanInputDisplay(amount / 10n);
}
