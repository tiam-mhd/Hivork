import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSTALLMENTS_SETTINGS,
  installmentsSettingsSchema,
} from './settings.schema.js';

describe('installmentsSettingsSchema', () => {
  it('applies defaults from api-contracts via contracts package', () => {
    const settings = installmentsSettingsSchema.parse({});

    expect(settings).toEqual(DEFAULT_INSTALLMENTS_SETTINGS);
    expect(settings.reminder_days_before).toEqual([3, 1]);
    expect(settings.reminder_on_due_date).toBe(true);
    expect(settings.reminder_time).toBe('09:00');
    expect(settings.default_installment_count).toBe(12);
    expect(settings.default_reminder_channels).toEqual(['telegram']);
  });

  it('rejects invalid reminder_time format', () => {
    expect(() => installmentsSettingsSchema.parse({ reminder_time: '9:00' })).toThrow();
  });
});
