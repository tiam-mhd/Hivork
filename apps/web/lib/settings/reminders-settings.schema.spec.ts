import { describe, expect, it } from 'vitest';

import {
  RemindersSettingsFormSchema,
  validateRemindersForm,
} from './reminders-settings.schema';

describe('RemindersSettingsFormSchema', () => {
  it('accepts valid reminder settings', () => {
    const result = RemindersSettingsFormSchema.safeParse({
      reminder_days_before: [3, 1],
      reminder_on_due_date: true,
      overdue_escalation_days: [1, 3, 7],
      reminder_time: '09:00',
      default_reminder_channels: ['telegram'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid reminder time', () => {
    const result = RemindersSettingsFormSchema.safeParse({
      reminder_days_before: [1],
      reminder_on_due_date: true,
      overdue_escalation_days: [1],
      reminder_time: '9:00',
      default_reminder_channels: ['telegram'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown channel values', () => {
    const result = RemindersSettingsFormSchema.safeParse({
      reminder_days_before: [1],
      reminder_on_due_date: true,
      overdue_escalation_days: [1],
      reminder_time: '09:00',
      default_reminder_channels: ['email'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty days arrays', () => {
    const errors = validateRemindersForm({
      reminder_days_before: [],
      reminder_on_due_date: true,
      overdue_escalation_days: [],
      reminder_time: '09:00',
      default_reminder_channels: ['telegram'],
    });

    expect(errors.reminder_days_before).toBeTruthy();
    expect(errors.overdue_escalation_days).toBeTruthy();
  });
});
