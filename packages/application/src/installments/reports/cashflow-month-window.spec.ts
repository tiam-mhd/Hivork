import { describe, expect, it } from 'vitest';

import {
  buildMonthKey,
  getCashflowForecastWindow,
  padCashflowMonthBuckets,
} from './cashflow-month-window.js';

describe('cashflow-month-window', () => {
  it('builds a six-month window from the current month in tenant timezone', () => {
    const window = getCashflowForecastWindow(new Date('2026-06-29T12:00:00.000Z'), 'Asia/Tehran');

    expect(window.monthKeys).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(window.fromMonth).toBe('2026-06');
    expect(window.toMonth).toBe('2026-11');
    expect(window.toExclusive.getTime()).toBeGreaterThan(window.from.getTime());
  });

  it('pads missing months with zero buckets', () => {
    const padded = padCashflowMonthBuckets(
      ['2026-06', '2026-07', '2026-08'],
      [{ month: '2026-07', installmentCount: 2, totalRial: 3_000n }],
    );

    expect(padded).toEqual([
      { month: '2026-06', installmentCount: 0, totalRial: '0' },
      { month: '2026-07', installmentCount: 2, totalRial: '3000' },
      { month: '2026-08', installmentCount: 0, totalRial: '0' },
    ]);
  });

  it('formats month keys with zero padding', () => {
    expect(buildMonthKey(2026, 4)).toBe('2026-04');
  });
});
