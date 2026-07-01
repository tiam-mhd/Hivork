/** Core tenant settings — `docs/02-architecture/settings.md` */
export const coreSettingsSchema = {
  timezone: { type: 'enum', values: ['Asia/Tehran'], default: 'Asia/Tehran' },
  display_currency: { type: 'enum', values: ['toman', 'rial'], default: 'toman' },
  security_alert_new_ip: { type: 'boolean' as const, default: true },
  security_captcha_after_failures: { type: 'number' as const, default: 2, min: 0, max: 20 },
  security_lockout_max_attempts: { type: 'number' as const, default: 5, min: 1, max: 20 },
  security_lockout_duration_minutes: { type: 'number' as const, default: 30, min: 5, max: 1440 },
  security_lockout_reset_after_success: { type: 'boolean' as const, default: true },
  security_ip_allowlist_enabled: { type: 'boolean' as const, default: false },
  security_ip_allowlist_cidrs: {
    type: 'string-array' as const,
    maxItems: 50,
    default: [] as readonly string[],
  },
} as const;

export type CoreSettingsSchema = typeof coreSettingsSchema;
export type CoreSettingKey = keyof CoreSettingsSchema;
