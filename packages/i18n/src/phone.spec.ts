import { describe, expect, it } from 'vitest';

import { formatPhoneDisplay } from './phone.js';

describe('formatPhoneDisplay', () => {
  it('formats normalized mobile numbers', () => {
    expect(formatPhoneDisplay('09123456789')).toBe('0912 345 6789');
  });

  it('returns original value when not a valid mobile', () => {
    expect(formatPhoneDisplay('invalid')).toBe('invalid');
    expect(formatPhoneDisplay('9123456789')).toBe('9123456789');
  });
});
