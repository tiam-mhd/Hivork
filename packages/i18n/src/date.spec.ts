import { describe, expect, it } from 'vitest';

import {
  compareIsoDateOnly,
  isoToGregorianDisplay,
  isoToJalaliDisplay,
  jalaliInputToIso,
  parseIsoDateOnly,
  parseJalaliDateToIso,
} from './dates.js';
import { formatJalaliDate } from './dates.js';

describe('formatJalaliDate', () => {
  it('formats a known Gregorian date in Jalali (Tehran)', () => {
    expect(formatJalaliDate(new Date('2024-03-20T12:00:00.000Z'))).toBe('۱۴۰۳/۰۱/۰۱');
  });

  it('uses Asia/Tehran at midnight boundary, not UTC', () => {
    const nearTehranMidnight = new Date('2024-06-20T20:30:00.000Z');
    const earlierSameUtcDay = new Date('2024-06-20T19:00:00.000Z');

    expect(formatJalaliDate(nearTehranMidnight)).toBe('۱۴۰۳/۰۴/۰۱');
    expect(formatJalaliDate(earlierSameUtcDay)).toBe('۱۴۰۳/۰۳/۳۱');
    expect(formatJalaliDate(nearTehranMidnight)).not.toBe(formatJalaliDate(earlierSameUtcDay));
  });
});

describe('parseJalaliDateToIso', () => {
  it('parses Jalali date to Gregorian ISO', () => {
    expect(parseJalaliDateToIso('1403/01/01')).toBe('2024-03-20');
  });

  it('returns null for invalid jalali date', () => {
    expect(parseJalaliDateToIso('invalid')).toBeNull();
    expect(jalaliInputToIso(1405, 13, 40)).toBeNull();
  });
});

describe('iso roundtrip', () => {
  it('converts iso to jalali display and back', () => {
    const iso = '2024-03-20';
    const display = isoToJalaliDisplay(iso, 'fa');
    expect(display).toBe('۱۴۰۳/۰۱/۰۱');
    expect(parseJalaliDateToIso('1403/01/01')).toBe(iso);
  });

  it('parses iso date-only as UTC midnight', () => {
    const date = parseIsoDateOnly('2024-03-20');
    expect(date?.toISOString()).toBe('2024-03-20T00:00:00.000Z');
  });

  it('compares iso dates', () => {
    expect(compareIsoDateOnly('2024-03-20', '2024-03-21')).toBeLessThan(0);
    expect(compareIsoDateOnly('2024-03-21', '2024-03-20')).toBeGreaterThan(0);
  });

  it('formats gregorian display for en locale', () => {
    const formatted = isoToGregorianDisplay('2024-03-20', 'en');
    expect(formatted).toContain('2024');
  });
});
