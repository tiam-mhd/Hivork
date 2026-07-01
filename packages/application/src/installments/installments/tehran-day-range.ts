export const TEHRAN_TIMEZONE = 'Asia/Tehran';
const MS_PER_DAY = 86_400_000;

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const zoned = new Date(date.toLocaleString('en-US', { timeZone }));

  return zoned.getTime() - utc.getTime();
}

export function startOfDayInTimezone(date: Date, timeZone: string): Date {
  const offset = getTimezoneOffsetMs(date, timeZone);
  const local = new Date(date.getTime() + offset);
  local.setUTCHours(0, 0, 0, 0);

  return new Date(local.getTime() - offset);
}

export function endOfDayInTimezone(date: Date, timeZone: string): Date {
  const start = startOfDayInTimezone(date, timeZone);

  return new Date(start.getTime() + MS_PER_DAY - 1);
}

export function getTodayUtcRangeInTimezone(now: Date, timeZone: string): { from: Date; to: Date } {
  return {
    from: startOfDayInTimezone(now, timeZone),
    to: endOfDayInTimezone(now, timeZone),
  };
}

export function getTehranTodayUtcRange(now = new Date()): { from: Date; to: Date } {
  return getTodayUtcRangeInTimezone(now, TEHRAN_TIMEZONE);
}

export function getCalendarMonthRangeInTimezone(
  now: Date,
  timeZone: string,
): { from: Date; to: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    from: startOfDayInTimezone(new Date(Date.UTC(year, month - 1, 1)), timeZone),
    to: endOfDayInTimezone(new Date(Date.UTC(year, month - 1, lastDay)), timeZone),
  };
}

function tehranCalendarDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TEHRAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** End of the Tehran calendar day that is `daysBefore` days before `now` (Tehran). */
export function endOfTehranDayCalendarDaysBefore(now: Date, daysBefore: number): Date {
  const parts = tehranCalendarDateKey(now).split('-').map((part) => Number(part));
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const targetUtc = Date.UTC(year, month - 1, day - daysBefore);

  return endOfDayInTimezone(new Date(targetUtc), TEHRAN_TIMEZONE);
}
