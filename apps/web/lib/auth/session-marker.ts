/** Client-visible session marker for Next.js middleware (refresh cookie lives on API host). */

export const STAFF_SESSION_COOKIE = 'hivork_staff_session';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function setStaffSessionMarker(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${STAFF_SESSION_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearStaffSessionMarker(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${STAFF_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
