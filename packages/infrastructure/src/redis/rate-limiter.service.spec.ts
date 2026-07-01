import { describe, expect, it, vi } from 'vitest';

import { OTP_RATE_LIMIT_WINDOW_SECONDS, OtpRateLimiterService } from './rate-limiter.service.js';

describe('OtpRateLimiterService', () => {
  it('increments redis key and sets ttl on first request', async () => {
    const incr = vi.fn().mockResolvedValue(1);
    const expire = vi.fn().mockResolvedValue(1);
    const limiter = new OtpRateLimiterService({ client: { incr, expire } } as never, 3);

    await expect(limiter.checkOtpRateLimit('09123456789')).resolves.toBe(true);

    expect(incr).toHaveBeenCalledWith('ratelimit:otp:09123456789');
    expect(expire).toHaveBeenCalledWith('ratelimit:otp:09123456789', OTP_RATE_LIMIT_WINDOW_SECONDS);
  });

  it('allows up to the configured limit', async () => {
    const incr = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    const expire = vi.fn().mockResolvedValue(1);
    const limiter = new OtpRateLimiterService({ client: { incr, expire } } as never, 3);

    await expect(limiter.checkOtpRateLimit('09123456789')).resolves.toBe(true);
    await expect(limiter.checkOtpRateLimit('09123456789')).resolves.toBe(true);
    await expect(limiter.checkOtpRateLimit('09123456789')).resolves.toBe(true);
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it('blocks the 4th request within the window', async () => {
    const incr = vi.fn().mockResolvedValue(4);
    const expire = vi.fn();
    const limiter = new OtpRateLimiterService({ client: { incr, expire } } as never, 3);

    await expect(limiter.checkOtpRateLimit('09123456789')).resolves.toBe(false);
  });
});
