/**
 * Installment module tenant settings.
 *
 * `lateFeePercent` is stored as a bigint-safe string representing percent × 100
 * (e.g. "150" = 1.50% late fee). Using bigint-string avoids float precision loss.
 */
export const installmentsSettingsSchema = {
  defaultGraceDays: { type: 'number' as const, min: 0, max: 30, default: 0 },
  lateFeePercent: {
    type: 'bigint-string' as const,
    min: '0',
    max: '10000',
    default: '0',
  },
} as const;

export type InstallmentsSettingsSchema = typeof installmentsSettingsSchema;
export type InstallmentsSettingKey = keyof InstallmentsSettingsSchema;
