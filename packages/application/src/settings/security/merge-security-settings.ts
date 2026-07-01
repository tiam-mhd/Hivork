import { DEFAULT_SECURITY_SETTINGS, type SecuritySettingsDto } from '@hivork/contracts';

export const CORE_MODULE = 'core';

export const SECURITY_SETTING_KEYS = {
  ipAllowlistEnabled: 'security_ip_allowlist_enabled',
  ipAllowlistCidrs: 'security_ip_allowlist_cidrs',
} as const;

export function mergeSecuritySettings(stored: Record<string, unknown>): SecuritySettingsDto {
  const enabled = stored[SECURITY_SETTING_KEYS.ipAllowlistEnabled];
  const cidrs = stored[SECURITY_SETTING_KEYS.ipAllowlistCidrs];

  return {
    ipAllowlist: {
      enabled:
        typeof enabled === 'boolean'
          ? enabled
          : DEFAULT_SECURITY_SETTINGS.ipAllowlist.enabled,
      cidrs: Array.isArray(cidrs)
        ? cidrs.filter((entry): entry is string => typeof entry === 'string')
        : [...DEFAULT_SECURITY_SETTINGS.ipAllowlist.cidrs],
    },
  };
}
