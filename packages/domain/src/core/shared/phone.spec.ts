import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';
import { normalizePhone, validatePhone } from './phone.js';

describe('phone utils', () => {
  it.each([
    ['09123456789', '09123456789'],
    ['9123456789', '09123456789'],
    ['989123456789', '09123456789'],
    ['+98 912 345 6789', '09123456789'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('throws INVALID_PHONE for landline prefix', () => {
    expect(() => normalizePhone('08123456789')).toThrow(DomainError);
    expect(() => normalizePhone('08123456789')).toThrow(/INVALID_PHONE/);
  });

  it('validates already-normalized numbers', () => {
    expect(() => validatePhone('09123456789')).not.toThrow();
    expect(() => validatePhone('123')).toThrow(DomainError);
  });
});
