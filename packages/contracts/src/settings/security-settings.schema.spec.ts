import { describe, expect, it } from 'vitest';

import {
  SecuritySettingsSchema,
  UpdateSecuritySettingsSchema,
} from './security-settings.schema.js';

describe('SecuritySettingsSchema', () => {
  it('parses default-shaped security settings', () => {
    const parsed = SecuritySettingsSchema.parse({
      ipAllowlist: { enabled: false, cidrs: [] },
    });
    expect(parsed.ipAllowlist.enabled).toBe(false);
  });
});

describe('UpdateSecuritySettingsSchema', () => {
  it('accepts partial ipAllowlist patch', () => {
    const patch = UpdateSecuritySettingsSchema.parse({
      ipAllowlist: { enabled: true },
    });
    expect(patch.ipAllowlist.enabled).toBe(true);
  });

  it('rejects invalid IPv4 CIDR', () => {
    expect(() =>
      UpdateSecuritySettingsSchema.parse({
        ipAllowlist: { cidrs: ['not-an-ip'] },
      }),
    ).toThrow();
  });

  it('rejects empty patch body', () => {
    expect(() => UpdateSecuritySettingsSchema.parse({ ipAllowlist: {} })).toThrow();
  });
});
