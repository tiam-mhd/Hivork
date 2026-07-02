import { describe, expect, it } from 'vitest';

import { computeRealtimeBackoffMs } from './realtime-backoff.js';

describe('computeRealtimeBackoffMs', () => {
  it('starts at 1s and caps at 30s', () => {
    expect(computeRealtimeBackoffMs(1)).toBe(1_000);
    expect(computeRealtimeBackoffMs(2)).toBe(2_000);
    expect(computeRealtimeBackoffMs(3)).toBe(4_000);
    expect(computeRealtimeBackoffMs(10)).toBe(30_000);
  });
});
