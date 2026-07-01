import { describe, expect, it } from 'vitest';

import { formatPhoneDisplay, maskPhone } from './phone-utils';

describe('phone-utils', () => {
  it('masks a valid Iranian mobile for display', () => {
    expect(maskPhone('09121234567')).toBe('0912***4567');
  });

  it('returns original value when phone is invalid', () => {
    expect(maskPhone('123')).toBe('123');
  });

  it('formats valid phone for LTR display', () => {
    expect(formatPhoneDisplay('09121234567')).toBe('09121234567');
  });
});
