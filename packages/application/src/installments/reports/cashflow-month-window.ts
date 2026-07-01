import { startOfDayInTimezone } from '../installments/tehran-day-range.js';

export const CASHFLOW_FORECAST_HORIZON_MONTHS = 6;

function addCalendarMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;

  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

export function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatMonthKeyInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1);

  return buildMonthKey(year, month);
}

export function getCashflowForecastWindow(
  now: Date,
  timeZone: string,
  horizonMonths = CASHFLOW_FORECAST_HORIZON_MONTHS,
): {
  from: Date;
  toExclusive: Date;
  monthKeys: string[];
  fromMonth: string;
  toMonth: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1);

  const monthKeys: string[] = [];
  for (let index = 0; index < horizonMonths; index++) {
    const shifted = addCalendarMonths(year, month, index);
    monthKeys.push(buildMonthKey(shifted.year, shifted.month));
  }

  const from = startOfDayInTimezone(new Date(Date.UTC(year, month - 1, 1)), timeZone);
  const end = addCalendarMonths(year, month, horizonMonths);
  const toExclusive = startOfDayInTimezone(
    new Date(Date.UTC(end.year, end.month - 1, 1)),
    timeZone,
  );

  return {
    from,
    toExclusive,
    monthKeys,
    fromMonth: monthKeys[0]!,
    toMonth: monthKeys[monthKeys.length - 1]!,
  };
}

export function padCashflowMonthBuckets(
  monthKeys: string[],
  aggregates: Array<{ month: string; installmentCount: number; totalRial: bigint }>,
): Array<{ month: string; installmentCount: number; totalRial: string }> {
  const byMonth = new Map(aggregates.map((row) => [row.month, row]));

  return monthKeys.map((month) => {
    const row = byMonth.get(month);

    return {
      month,
      installmentCount: row?.installmentCount ?? 0,
      totalRial: (row?.totalRial ?? 0n).toString(),
    };
  });
}
