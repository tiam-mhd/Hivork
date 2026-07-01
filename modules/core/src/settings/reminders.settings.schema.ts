/** Reminder notification settings — applies to installment due-date reminders */
export const remindersSettingsSchema = {
  enabled: { type: 'boolean' as const, default: true },
  daysBefore: { type: 'number' as const, min: 1, max: 30, default: 3 },
  channels: {
    type: 'enum-array' as const,
    values: ['sms', 'telegram', 'bale'] as const,
    default: ['sms'],
  },
} as const;

export type RemindersSettingsSchema = typeof remindersSettingsSchema;
export type RemindersSettingKey = keyof RemindersSettingsSchema;
