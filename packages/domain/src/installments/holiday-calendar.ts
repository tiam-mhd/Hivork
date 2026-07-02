/** Gregorian calendar date — YYYY-MM-DD (matches settings `custom_holiday_dates`). */
export type DateOnly = string;

export type HolidayCalendarSource =
  | 'jalali_official'
  | 'custom_only'
  | 'merge_official_and_custom';

export type RoundingMode = 'none' | 'floor' | 'ceil' | 'nearest';

/** Supplies Iran official Jalali-calendar holidays as Gregorian YYYY-MM-DD (no PII). */
export interface OfficialHolidayCalendarProvider {
  getOfficialHolidayDates(): readonly DateOnly[];
}

/**
 * Static sample of Iran national holidays (Gregorian).
 * Phase 05 schedule generator may replace with a fuller yearly table package.
 */
export const DEFAULT_IRAN_OFFICIAL_HOLIDAY_DATES: readonly DateOnly[] = [
  '2025-03-20',
  '2025-03-21',
  '2025-03-22',
  '2025-03-23',
  '2025-03-24',
  '2025-06-04',
  '2026-03-20',
  '2026-03-21',
  '2026-03-22',
  '2026-03-23',
  '2026-03-24',
  '2026-06-04',
] as const;

export class StaticOfficialHolidayCalendarProvider implements OfficialHolidayCalendarProvider {
  constructor(private readonly dates: readonly DateOnly[] = DEFAULT_IRAN_OFFICIAL_HOLIDAY_DATES) {}

  getOfficialHolidayDates(): readonly DateOnly[] {
    return this.dates;
  }
}

export type ResolveHolidayDatesInput = {
  source: HolidayCalendarSource;
  customHolidayDates: readonly DateOnly[];
  officialProvider: OfficialHolidayCalendarProvider;
};

/** Union of official + custom holiday dates per tenant settings (IFP-073). */
export function resolveEffectiveHolidayDates(input: ResolveHolidayDatesInput): DateOnly[] {
  const official = input.officialProvider.getOfficialHolidayDates();
  const custom = input.customHolidayDates;

  switch (input.source) {
    case 'jalali_official':
      return [...official].sort();
    case 'custom_only':
      return [...custom].sort();
    case 'merge_official_and_custom':
      return [...new Set([...official, ...custom])].sort();
  }
}

export function isHolidayDate(date: DateOnly, holidays: readonly DateOnly[]): boolean {
  return holidays.includes(date);
}

/**
 * Rounds installment amounts per tenant settings.
 * When `mode` is `none`, `unitRial` is ignored (IFP-073 edge case).
 */
export function roundRialAmount(
  amountRial: bigint,
  mode: RoundingMode,
  unitRial: bigint,
): bigint {
  if (mode === 'none' || unitRial <= 0n) {
    return amountRial;
  }

  const remainder = amountRial % unitRial;
  if (remainder === 0n) {
    return amountRial;
  }

  const base = amountRial - remainder;

  switch (mode) {
    case 'floor':
      return base;
    case 'ceil':
      return base + unitRial;
    case 'nearest': {
      const half = unitRial / 2n;
      return remainder >= half ? base + unitRial : base;
    }
    default:
      return amountRial;
  }
}
