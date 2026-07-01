import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSTALLMENTS_SETTINGS,
  GetInstallmentsSettingsApiResponseSchema,
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
});

describe('GetInstallmentsSettingsApiResponseSchema', () => {
  it('parses GET response example', () => {
    const response = GetInstallmentsSettingsApiResponseSchema.parse({
      data: {
        installments: DEFAULT_INSTALLMENTS_SETTINGS,
      },
      meta: { requestId: '00000000-0000-0000-0000-000000000001' },
    });

    expect(response.data.installments.default_installment_count).toBe(12);
  });
});
