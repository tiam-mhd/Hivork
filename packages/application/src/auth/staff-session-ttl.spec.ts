import { describe, expect, it } from 'vitest';

import {
  STAFF_SESSION_SHORT_TTL_SECONDS,
  calculateStaffSessionExpiresAt,
  calculateSlidingSessionExpiresAt,
  resolveRefreshTtlSeconds,
} from './staff-session-ttl.js';

describe('staff-session-ttl', () => {
  const now = new Date('2026-06-30T12:00:00.000Z');
  const persistentTtlSeconds = 2_592_000;
  const sessionTtlSeconds = STAFF_SESSION_SHORT_TTL_SECONDS;

  it('uses session TTL when rememberMe is false', () => {
    expect(resolveRefreshTtlSeconds(false, persistentTtlSeconds, sessionTtlSeconds)).toBe(
      sessionTtlSeconds,
    );
    const expiresAt = calculateStaffSessionExpiresAt(
      false,
      now,
      persistentTtlSeconds,
      sessionTtlSeconds,
    );
    expect(expiresAt.getTime() - now.getTime()).toBe(sessionTtlSeconds * 1000);
  });

  it('uses persistent TTL when rememberMe is true', () => {
    expect(resolveRefreshTtlSeconds(true, persistentTtlSeconds, sessionTtlSeconds)).toBe(
      persistentTtlSeconds,
    );
    const expiresAt = calculateStaffSessionExpiresAt(
      true,
      now,
      persistentTtlSeconds,
      sessionTtlSeconds,
    );
    expect(expiresAt.getTime() - now.getTime()).toBe(persistentTtlSeconds * 1000);
  });

  it('slides expiry on refresh for both session types', () => {
    const shortExpiry = calculateSlidingSessionExpiresAt(
      false,
      now,
      persistentTtlSeconds,
      sessionTtlSeconds,
    );
    expect(shortExpiry.getTime()).toBe(now.getTime() + sessionTtlSeconds * 1000);

    const persistentExpiry = calculateSlidingSessionExpiresAt(
      true,
      now,
      persistentTtlSeconds,
      sessionTtlSeconds,
    );
    expect(persistentExpiry.getTime()).toBe(now.getTime() + persistentTtlSeconds * 1000);
  });
});
