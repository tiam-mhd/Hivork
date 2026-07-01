import { describe, expect, it } from 'vitest';

import { UserMfaTotp } from './user-mfa-totp.entity.js';

describe('UserMfaTotp', () => {
  it('detects replay within the same 30s window', () => {
    const record = UserMfaTotp.create('user-1', 'encrypted-secret');
    record.enable([{ hash: 'h1', usedAt: null }], new Date('2026-06-30T12:00:05.000Z'));
    record.markTotpUsed(new Date('2026-06-30T12:00:10.000Z'));

    expect(record.isReplayInCurrentWindow(new Date('2026-06-30T12:00:20.000Z'))).toBe(true);
    expect(record.isReplayInCurrentWindow(new Date('2026-06-30T12:00:35.000Z'))).toBe(false);
  });
});
