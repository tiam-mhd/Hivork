/** Start of UTC calendar day for date comparisons (BR-006). */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Add whole UTC days — installment due dates use calendar-day intervals (BR-007). */
export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

const TEHRAN_TIMEZONE = 'Asia/Tehran';

/** Gregorian YYYY-MM-DD in Asia/Tehran — used for installment operation date rules (IFP-079). */
export function tehranDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TEHRAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Compare two instants by Tehran calendar day. Returns negative if a < b. */
export function compareTehranDates(a: Date, b: Date): number {
  return tehranDateKey(a).localeCompare(tehranDateKey(b));
}
