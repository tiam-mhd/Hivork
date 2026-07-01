import { describe, expect, it } from 'vitest';

import { formatJalaliDate } from './date.js';

describe('formatJalaliDate', () => {
  it('formats a known Gregorian date in Jalali (Tehran)', () => {
    // 2024-03-20 12:00 UTC → 2024-03-20 15:30 Tehran → 1403/01/01
    expect(formatJalaliDate(new Date('2024-03-20T12:00:00.000Z'))).toBe('۱۴۰۳/۰۱/۰۱');
  });

  it('uses Asia/Tehran at midnight boundary, not UTC', () => {
    // 2024-06-20 20:30 UTC → 2024-06-21 00:00 Tehran (next local day)
    const nearTehranMidnight = new Date('2024-06-20T20:30:00.000Z');
    // 2024-06-20 19:00 UTC → 2024-06-20 22:30 Tehran (same local day)
    const earlierSameUtcDay = new Date('2024-06-20T19:00:00.000Z');

    expect(formatJalaliDate(nearTehranMidnight)).toBe('۱۴۰۳/۰۴/۰۱');
    expect(formatJalaliDate(earlierSameUtcDay)).toBe('۱۴۰۳/۰۳/۳۱');
    expect(formatJalaliDate(nearTehranMidnight)).not.toBe(formatJalaliDate(earlierSameUtcDay));
  });
});

describe('parseJalaliDateToIso', () => {
  it('parses Jalali date to Gregorian ISO', async () => {
    const { parseJalaliDateToIso } = await import('./date.js');
    expect(parseJalaliDateToIso('1403/01/01')).toBe('2024-03-20');
  });

  it('returns null for invalid jalali date', async () => {
    const { parseJalaliDateToIso } = await import('./date.js');
    expect(parseJalaliDateToIso('invalid')).toBeNull();
  });
});
