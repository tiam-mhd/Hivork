import { describe, expect, it } from 'vitest';

import { joinOtpDigits, nextOtpFocusIndex, OTP_LENGTH, splitOtpDigits } from './otp-utils';

describe('otp-utils', () => {
  it('splits and joins OTP digits', () => {
    expect(splitOtpDigits('123')).toEqual(['1', '2', '3', '', '']);
    expect(joinOtpDigits(['1', '2', '3', '4', '5'])).toBe('12345');
  });

  it('advances focus to next cell when a digit is entered', () => {
    expect(nextOtpFocusIndex(0, '1')).toBe(1);
    expect(nextOtpFocusIndex(OTP_LENGTH - 1, '5')).toBeNull();
    expect(nextOtpFocusIndex(2, '')).toBeNull();
  });
});
