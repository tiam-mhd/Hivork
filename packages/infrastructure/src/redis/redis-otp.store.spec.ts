import { describe, expect, it, vi } from 'vitest';

import { RedisOtpStore } from './redis-otp.store.js';

describe('RedisOtpStore', () => {
  it('writes otp payload to redis with ttl', async () => {
    const set = vi.fn().mockResolvedValue('OK');
    const store = new RedisOtpStore({ client: { set } } as never);

    await store.save({
      actor: 'staff',
      phone: '09123456789',
      record: { code: '12345', attempts: 0 },
      ttlSeconds: 120,
    });

    expect(set).toHaveBeenCalledWith(
      'otp:staff:09123456789',
      JSON.stringify({ code: '12345', attempts: 0 }),
      'EX',
      120,
    );
  });

  it('uses mfa_step_up key namespace', async () => {
    const set = vi.fn().mockResolvedValue('OK');
    const store = new RedisOtpStore({ client: { set } } as never);

    await store.save({
      actor: 'staff',
      phone: '09123456789',
      purpose: 'mfa_step_up',
      record: { code: '12345', attempts: 0 },
      ttlSeconds: 120,
    });

    expect(set).toHaveBeenCalledWith(
      'otp:mfa_step_up:staff:09123456789',
      JSON.stringify({ code: '12345', attempts: 0 }),
      'EX',
      120,
    );
  });
});
