import { ErrorCodes } from '@hivork/contracts';
import { describe, expect, it } from 'vitest';

import { ERROR_MESSAGES_FA, getErrorMessageFa } from './error-messages.fa';

describe('ERROR_MESSAGES_FA', () => {
  it('covers all ErrorCodes from contracts', () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(ERROR_MESSAGES_FA[code], `missing fa message for ${code}`).toBeTruthy();
    }
  });

  it('maps Phase 1 customer and auth aliases', () => {
    expect(getErrorMessageFa('CUSTOMER_ALREADY_EXISTS')).toContain('قبلاً');
    expect(getErrorMessageFa('AUTH_OTP_RATE_LIMITED')).toContain('صبر');
    expect(getErrorMessageFa('BRANCH_NOT_ALLOWED')).toContain('شعبه');
  });

  it('falls back to server message when provided', () => {
    expect(getErrorMessageFa('UNKNOWN_CODE', 'پیام سرور')).toBe('پیام سرور');
  });
});
