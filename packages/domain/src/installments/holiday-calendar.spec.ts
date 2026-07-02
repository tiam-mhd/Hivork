import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IRAN_OFFICIAL_HOLIDAY_DATES,
  StaticOfficialHolidayCalendarProvider,
  isHolidayDate,
  resolveEffectiveHolidayDates,
  roundRialAmount,
} from './holiday-calendar.js';

describe('resolveEffectiveHolidayDates (IFP-073)', () => {
  const provider = new StaticOfficialHolidayCalendarProvider(['2025-03-20', '2025-06-04']);

  it('returns official dates only for jalali_official', () => {
    expect(
      resolveEffectiveHolidayDates({
        source: 'jalali_official',
        customHolidayDates: ['2025-12-25'],
        officialProvider: provider,
      }),
    ).toEqual(['2025-03-20', '2025-06-04']);
  });

  it('returns custom dates only for custom_only', () => {
    expect(
      resolveEffectiveHolidayDates({
        source: 'custom_only',
        customHolidayDates: ['2025-12-25', '2025-12-26'],
        officialProvider: provider,
      }),
    ).toEqual(['2025-12-25', '2025-12-26']);
  });

  it('merges and deduplicates for merge_official_and_custom', () => {
    expect(
      resolveEffectiveHolidayDates({
        source: 'merge_official_and_custom',
        customHolidayDates: ['2025-03-20', '2025-12-25'],
        officialProvider: provider,
      }),
    ).toEqual(['2025-03-20', '2025-06-04', '2025-12-25']);
  });

  it('default static provider exposes sample official dates', () => {
    const dates = new StaticOfficialHolidayCalendarProvider().getOfficialHolidayDates();
    expect(dates).toEqual(DEFAULT_IRAN_OFFICIAL_HOLIDAY_DATES);
    expect(dates.length).toBeGreaterThan(0);
  });
});

describe('isHolidayDate', () => {
  it('detects membership in resolved set', () => {
    const holidays = ['2025-03-20', '2025-06-04'];
    expect(isHolidayDate('2025-03-20', holidays)).toBe(true);
    expect(isHolidayDate('2025-01-01', holidays)).toBe(false);
  });
});

describe('roundRialAmount (IFP-073 documented behavior)', () => {
  const amount = 1_234_500n;
  const unit = 1_000n;

  it('NEAREST at 1000 Rial: 1_234_500 → 1_235_000', () => {
    expect(roundRialAmount(amount, 'nearest', unit)).toBe(1_235_000n);
  });

  it('FLOOR: 1_234_500 → 1_234_000', () => {
    expect(roundRialAmount(amount, 'floor', unit)).toBe(1_234_000n);
  });

  it('CEIL: 1_234_500 → 1_235_000', () => {
    expect(roundRialAmount(amount, 'ceil', unit)).toBe(1_235_000n);
  });

  it('NONE ignores unit at runtime', () => {
    expect(roundRialAmount(amount, 'none', unit)).toBe(amount);
  });
});
