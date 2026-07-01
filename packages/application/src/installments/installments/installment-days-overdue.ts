import { startOfDayInTimezone, TEHRAN_TIMEZONE } from './tehran-day-range.js';

const DAY_MS = 86_400_000;

function tehranDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TEHRAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function calendarDayDiffTehran(later: Date, earlier: Date): number {
  const laterUtc = Date.parse(`${tehranDateKey(later)}T00:00:00Z`);
  const earlierUtc = Date.parse(`${tehranDateKey(earlier)}T00:00:00Z`);

  return Math.round((laterUtc - earlierUtc) / DAY_MS);
}

export function computeDaysOverdue(
  dueDate: Date,
  status: 'pending' | 'overdue' | 'paid' | 'waived',
  now: Date = new Date(),
): number {
  if (status === 'paid' || status === 'waived') {
    return 0;
  }

  const todayStart = startOfDayInTimezone(now, TEHRAN_TIMEZONE);
  const isPastDue = status === 'overdue' || (status === 'pending' && dueDate < todayStart);

  if (!isPastDue) {
    return 0;
  }

  return Math.max(0, calendarDayDiffTehran(now, dueDate));
}
