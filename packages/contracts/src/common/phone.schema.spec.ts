import { describe, expect, it } from 'vitest';

import { normalizePhone, phoneSchema } from './phone.schema.js';

describe('normalizePhone', () => {
  it.each([
    ['09123456789', '09123456789'],
    ['9123456789', '09123456789'],
    ['989123456789', '09123456789'],
    ['+98 912 345 6789', '09123456789'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('throws for invalid landline prefix', () => {
    expect(() => normalizePhone('08123456789')).toThrow('INVALID_PHONE');
  });

  it('throws for too-short numbers', () => {
    expect(() => normalizePhone('0912345')).toThrow('INVALID_PHONE');
  });
});

describe('phoneSchema', () => {
  it('accepts normalized Iranian mobile numbers', () => {
    expect(phoneSchema.parse('09123456789')).toBe('09123456789');
  });

  it('normalizes common input formats', () => {
    expect(phoneSchema.parse('9123456789')).toBe('09123456789');
    expect(phoneSchema.parse('+98 912 345 6789')).toBe('09123456789');
  });

  it('rejects invalid numbers', () => {
    expect(phoneSchema.safeParse('08123456789').success).toBe(false);
    expect(phoneSchema.safeParse('912345678').success).toBe(false);
  });
});
