import { describe, expect, it } from 'vitest';

import {
  ContractNumberingSettingsSchema,
  DEFAULT_INSTALLMENTS_SETTINGS,
  GetInstallmentsSettingsApiResponseSchema,
  InstallmentsSettingsReadSchema,
  InstallmentsSettingsSchema,
  UpdateInstallmentsSettingsSchema,
} from './settings.schema.js';

describe('InstallmentsSettingsSchema', () => {
  it('parses full settings with defaults', () => {
    const settings = InstallmentsSettingsSchema.parse({});

    expect(settings).toEqual(DEFAULT_INSTALLMENTS_SETTINGS);
    expect(settings.reminder_days_before).toEqual([3, 1]);
    expect(settings.reminder_time).toBe('09:00');
    expect(settings.default_installment_count).toBe(12);
    expect(settings.default_reminder_channels).toEqual(['telegram']);
    expect(settings.customer_export_max_rows).toBe(5000);
    expect(settings.customer_document_max_bytes).toBe(10 * 1024 * 1024);
    expect(settings.customer_scoring_payment_confirmed_delta).toBe(5);
    expect(settings.customer_scoring_installment_overdue_delta).toBe(-10);
    expect(settings.customer_auto_blacklist_score_threshold).toBeNull();
    expect(settings.calculation_formula).toBe('equal_installments');
    expect(settings.penalty_type).toBe('none');
    expect(settings.penalty_rate_bps).toBe(0);
    expect(settings.penalty_fixed_rial).toBe('0');
    expect(settings.penalty_grace_days).toBe(0);
    expect(settings.interest_rate_bps_annual).toBe(0);
    expect(settings.interest_calculation_method).toBe('none');
    expect(settings.rounding_mode).toBe('nearest');
    expect(settings.rounding_unit_rial).toBe('1000');
    expect(settings.skip_holidays_in_schedule).toBe(true);
    expect(settings.holiday_calendar_source).toBe('merge_official_and_custom');
    expect(settings.custom_holiday_dates).toEqual([]);
    expect(settings.calendar_display_mode).toBe('jalali');
    expect(settings.calendar_input_mode).toBe('jalali');
    expect(settings.contract_numbering_enabled).toBe(true);
    expect(settings.contract_number_prefix).toBe('CTR');
    expect(settings.contract_number_suffix).toBeUndefined();
    expect(settings.contract_number_pad_length).toBe(6);
    expect(settings.contract_number_include_year).toBe(true);
  });

  it('sorts reminder_days_before desc after transform', () => {
    const settings = InstallmentsSettingsSchema.parse({ reminder_days_before: [1, 5, 2] });
    expect(settings.reminder_days_before).toEqual([5, 2, 1]);
  });

  it('sorts overdue_escalation_days asc after transform', () => {
    const settings = InstallmentsSettingsSchema.parse({ overdue_escalation_days: [7, 1, 3] });
    expect(settings.overdue_escalation_days).toEqual([1, 3, 7]);
  });

  it('invalid reminder_time fails', () => {
    expect(() => InstallmentsSettingsSchema.parse({ reminder_time: '25:00' })).toThrow();
    expect(() => InstallmentsSettingsSchema.parse({ reminder_time: '9:00' })).toThrow();
  });

  it('duplicate reminder_days_before fails', () => {
    const result = InstallmentsSettingsSchema.safeParse({ reminder_days_before: [3, 3] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'DUPLICATE_VALUES')).toBe(true);
    }
  });

  it('default_installment_count bounds', () => {
    expect(() => InstallmentsSettingsSchema.parse({ default_installment_count: 0 })).toThrow();
    expect(() => InstallmentsSettingsSchema.parse({ default_installment_count: 121 })).toThrow();
  });

  it('empty default_reminder_channels fails', () => {
    expect(() => InstallmentsSettingsSchema.parse({ default_reminder_channels: [] })).toThrow();
  });

  it('overdue_escalation_days min 1', () => {
    expect(() => InstallmentsSettingsSchema.parse({ overdue_escalation_days: [0] })).toThrow();
  });

  it('percent_daily requires penalty_rate_bps', () => {
    const result = InstallmentsSettingsSchema.safeParse({
      penalty_type: 'percent_daily',
      penalty_rate_bps: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'PENALTY_RATE_REQUIRED')).toBe(
        true,
      );
    }
  });

  it('percent_monthly requires penalty_rate_bps', () => {
    const result = InstallmentsSettingsSchema.safeParse({
      penalty_type: 'percent_monthly',
      penalty_rate_bps: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'PENALTY_RATE_REQUIRED')).toBe(
        true,
      );
    }
  });

  it('fixed_daily requires penalty_fixed_rial', () => {
    const result = InstallmentsSettingsSchema.safeParse({
      penalty_type: 'fixed_daily',
      penalty_fixed_rial: '0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'PENALTY_FIXED_REQUIRED')).toBe(
        true,
      );
    }
  });

  it('accepts valid penalty and interest configuration', () => {
    const settings = InstallmentsSettingsSchema.parse({
      penalty_type: 'percent_daily',
      penalty_rate_bps: 50,
      penalty_grace_days: 3,
      interest_rate_bps_annual: 2400,
      interest_calculation_method: 'simple',
      calculation_formula: 'declining_balance',
    });

    expect(settings.penalty_rate_bps).toBe(50);
    expect(settings.interest_calculation_method).toBe('simple');
  });

  it('rejects penalty_rate_bps above 10000', () => {
    expect(() =>
      InstallmentsSettingsSchema.parse({ penalty_rate_bps: 10001 }),
    ).toThrow();
  });

  it('allows custom calculation_formula (Phase 05 implementation)', () => {
    const settings = InstallmentsSettingsSchema.parse({ calculation_formula: 'custom' });
    expect(settings.calculation_formula).toBe('custom');
  });

  it('accepts whitelisted rounding units', () => {
    for (const unit of ['1', '10', '100', '1000', '10000'] as const) {
      const settings = InstallmentsSettingsSchema.parse({ rounding_unit_rial: unit });
      expect(settings.rounding_unit_rial).toBe(unit);
    }
  });

  it('rejects invalid rounding unit 500', () => {
    const result = InstallmentsSettingsSchema.safeParse({ rounding_unit_rial: '500' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'ROUNDING_UNIT_INVALID')).toBe(
        true,
      );
    }
  });

  it('rejects duplicate custom holiday dates', () => {
    const result = InstallmentsSettingsSchema.safeParse({
      custom_holiday_dates: ['2025-03-20', '2025-03-20'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message === 'DUPLICATE_HOLIDAY_DATES'),
      ).toBe(true);
    }
  });

  it('rejects more than 100 custom holidays', () => {
    const dates = Array.from({ length: 101 }, (_, index) =>
      `2025-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    );

    expect(() => InstallmentsSettingsSchema.parse({ custom_holiday_dates: dates })).toThrow();
  });

  it('merges rounding and holiday defaults with stored partial values', () => {
    const settings = InstallmentsSettingsSchema.parse({
      rounding_mode: 'floor',
      custom_holiday_dates: ['2025-12-25'],
    });

    expect(settings.rounding_mode).toBe('floor');
    expect(settings.rounding_unit_rial).toBe('1000');
    expect(settings.skip_holidays_in_schedule).toBe(true);
    expect(settings.custom_holiday_dates).toEqual(['2025-12-25']);
  });

  it('accepts contract numbering and calendar settings', () => {
    const settings = InstallmentsSettingsSchema.parse({
      calendar_display_mode: 'both',
      calendar_input_mode: 'gregorian',
      contract_number_prefix: 'SH',
      contract_number_suffix: 'HQ',
      contract_number_pad_length: 8,
      contract_number_include_year: false,
    });

    expect(settings.calendar_display_mode).toBe('both');
    expect(settings.calendar_input_mode).toBe('gregorian');
    expect(settings.contract_number_prefix).toBe('SH');
    expect(settings.contract_number_suffix).toBe('HQ');
    expect(settings.contract_number_pad_length).toBe(8);
    expect(settings.contract_number_include_year).toBe(false);
  });
});

describe('UpdateInstallmentsSettingsSchema', () => {
  it('partial update single key', () => {
    const patch = UpdateInstallmentsSettingsSchema.parse({
      default_installment_count: 6,
      require_seller_payment_confirmation: false,
    });

    expect(patch).toEqual({
      default_installment_count: 6,
      require_seller_payment_confirmation: false,
    });
  });

  it('rejects unknown keys', () => {
    expect(() =>
      UpdateInstallmentsSettingsSchema.parse({ unknown_key: true }),
    ).toThrow();
  });

  it('partial update single penalty key', () => {
    const patch = UpdateInstallmentsSettingsSchema.parse({ penalty_grace_days: 5 });

    expect(patch).toEqual({ penalty_grace_days: 5 });
  });

  it('partial update rejects percent_daily without rate when type is in patch', () => {
    const result = UpdateInstallmentsSettingsSchema.safeParse({
      penalty_type: 'percent_daily',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'PENALTY_RATE_REQUIRED')).toBe(
        true,
      );
    }
  });

  it('partial update accepts percent_daily with rate in same patch', () => {
    const patch = UpdateInstallmentsSettingsSchema.parse({
      penalty_type: 'percent_daily',
      penalty_rate_bps: 25,
    });

    expect(patch).toEqual({
      penalty_type: 'percent_daily',
      penalty_rate_bps: 25,
    });
  });

  it('rejects read-only contract_number_next_sequence', () => {
    expect(() =>
      UpdateInstallmentsSettingsSchema.parse({ contract_number_next_sequence: 99 } as never),
    ).toThrow();
  });
});

describe('GetInstallmentsSettingsApiResponseSchema', () => {
  it('parses GET response example', () => {
    const response = GetInstallmentsSettingsApiResponseSchema.parse({
      data: {
        installments: {
          ...DEFAULT_INSTALLMENTS_SETTINGS,
          contract_number_next_sequence: 1,
        },
      },
      meta: { requestId: '00000000-0000-0000-0000-000000000001' },
    });

    expect(response.data.installments.default_installment_count).toBe(12);
    expect(response.data.installments.contract_number_next_sequence).toBe(1);
  });
});

describe('ContractNumberingSettingsSchema', () => {
  it('parses defaults for numbering settings', () => {
    const settings = ContractNumberingSettingsSchema.parse({});

    expect(settings).toEqual({
      calendar_display_mode: 'jalali',
      calendar_input_mode: 'jalali',
      contract_numbering_enabled: true,
      contract_number_prefix: 'CTR',
      contract_number_pad_length: 6,
      contract_number_include_year: true,
    });
  });
});

describe('InstallmentsSettingsReadSchema', () => {
  it('requires contract_number_next_sequence in GET shape', () => {
    const parsed = InstallmentsSettingsReadSchema.parse({
      ...DEFAULT_INSTALLMENTS_SETTINGS,
      contract_number_next_sequence: 42,
    });

    expect(parsed.contract_number_next_sequence).toBe(42);
  });
});
