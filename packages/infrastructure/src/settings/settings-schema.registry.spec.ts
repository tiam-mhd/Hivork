import { describe, expect, it } from 'vitest';

import { SettingsSchemaRegistry } from './settings-schema.registry.js';

describe('SettingsSchemaRegistry', () => {
  const registry = new SettingsSchemaRegistry();

  it('exposes core module schema', () => {
    const schema = registry.getSchema('core');

    expect(schema).toBeDefined();
    expect(schema?.timezone.default).toBe('Asia/Tehran');
    expect(schema?.display_currency.values).toContain('toman');
  });

  it('exposes reminders module schema', () => {
    const schema = registry.getSchema('reminders');

    expect(schema).toBeDefined();
    expect(schema?.enabled.type).toBe('boolean');
    expect(schema?.enabled.default).toBe(true);
    expect(schema?.daysBefore.type).toBe('number');
    expect(schema?.channels.type).toBe('enum-array');
  });

  it('exposes installments module schema', () => {
    const schema = registry.getSchema('installments');

    expect(schema).toBeDefined();
    expect(schema?.defaultGraceDays.type).toBe('number');
    expect(schema?.lateFeePercent.type).toBe('bigint-string');
    expect(schema?.lateFeePercent.default).toBe('0');
  });

  it('returns undefined for unknown module', () => {
    expect(registry.getSchema('unknown')).toBeUndefined();
    expect(registry.hasModule('unknown')).toBe(false);
  });
});
