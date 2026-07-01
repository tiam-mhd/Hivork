import { describe, expect, it } from 'vitest';

import { GetSettingsQuerySchema, UpdateSettingBodySchema } from './index.js';

describe('GetSettingsQuerySchema', () => {
  it('accepts module query param', () => {
    expect(GetSettingsQuerySchema.safeParse({ module: 'core' }).success).toBe(true);
  });

  it('rejects empty module', () => {
    expect(GetSettingsQuerySchema.safeParse({ module: '' }).success).toBe(false);
  });
});

describe('UpdateSettingBodySchema', () => {
  it('accepts arbitrary JSON value', () => {
    expect(UpdateSettingBodySchema.safeParse({ value: 'rial' }).success).toBe(true);
    expect(UpdateSettingBodySchema.safeParse({ value: true }).success).toBe(true);
  });
});
