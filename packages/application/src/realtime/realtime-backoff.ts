const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export function computeRealtimeBackoffMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  const delay = MIN_BACKOFF_MS * 2 ** exponent;
  return Math.min(delay, MAX_BACKOFF_MS);
}
