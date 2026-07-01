import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LOGIN_IP_WINDOW_SECONDS, LOGIN_PHONE_WINDOW_SECONDS } from '@hivork/application';

import { LoginRateLimiterService } from './login-rate-limiter.service.js';

describe('LoginRateLimiterService', () => {
  const incr = vi.fn();
  const expire = vi.fn();
  const redis = {
    client: { incr, expire },
  };

  const service = new LoginRateLimiterService(redis as never);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITEST = 'false';
  });

  it('allows attempts within phone and IP limits', async () => {
    incr.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await expect(service.checkAndRecord('09123456789', '1.2.3.4')).resolves.toBe(true);

    expect(incr).toHaveBeenCalledWith('ratelimit:login:phone:09123456789');
    expect(expire).toHaveBeenCalledWith(
      'ratelimit:login:phone:09123456789',
      LOGIN_PHONE_WINDOW_SECONDS,
    );
    expect(incr).toHaveBeenCalledWith('ratelimit:login:ip:1.2.3.4');
    expect(expire).toHaveBeenCalledWith('ratelimit:login:ip:1.2.3.4', LOGIN_IP_WINDOW_SECONDS);
  });

  it('blocks when phone limit exceeded', async () => {
    incr.mockResolvedValueOnce(11);

    await expect(service.checkAndRecord('09123456789', '1.2.3.4')).resolves.toBe(false);
    expect(incr).toHaveBeenCalledTimes(1);
  });
});
