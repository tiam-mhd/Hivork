import { describe, expect, it, vi } from 'vitest';

import { RedisTokenBlacklistService } from './redis-token-blacklist.service.js';

describe('RedisTokenBlacklistService', () => {
  it('stores revoked token hash with ttl', async () => {
    const set = vi.fn().mockResolvedValue('OK');
    const service = new RedisTokenBlacklistService({ client: { set, get: vi.fn() } } as never);

    await service.revoke('refresh-token', 60);

    expect(set).toHaveBeenCalledWith(expect.stringMatching(/^token:blacklist:/), '1', 'EX', 60);
  });
});
