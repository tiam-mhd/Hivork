/** 24h sliding session when rememberMe=false (IFP-008 / IFP-011). */
export const STAFF_SESSION_SHORT_TTL_SECONDS = 86_400;

/** Default max concurrent active sessions per staff (tenant setting override in IFP-009). */
export const DEFAULT_MAX_STAFF_SESSIONS = 20;

export function resolveRefreshTtlSeconds(
  rememberMe: boolean,
  persistentTtlSeconds: number,
  sessionTtlSeconds: number,
): number {
  return rememberMe ? persistentTtlSeconds : sessionTtlSeconds;
}

export function calculateStaffSessionExpiresAt(
  rememberMe: boolean,
  now: Date,
  persistentTtlSeconds: number,
  sessionTtlSeconds: number = STAFF_SESSION_SHORT_TTL_SECONDS,
): Date {
  const ttlSeconds = resolveRefreshTtlSeconds(rememberMe, persistentTtlSeconds, sessionTtlSeconds);
  return new Date(now.getTime() + ttlSeconds * 1000);
}

export function calculateSlidingSessionExpiresAt(
  rememberMe: boolean,
  now: Date,
  persistentTtlSeconds: number,
  sessionTtlSeconds: number = STAFF_SESSION_SHORT_TTL_SECONDS,
): Date {
  return calculateStaffSessionExpiresAt(rememberMe, now, persistentTtlSeconds, sessionTtlSeconds);
}
