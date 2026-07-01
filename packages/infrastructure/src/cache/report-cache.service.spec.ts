import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RedisReportCache } from './report-cache.service.js';

describe('RedisReportCache', () => {
  const redis = {
    client: {
      get: vi.fn(),
      set: vi.fn(),
      scan: vi.fn(),
      del: vi.fn(),
    },
  };

  const cache = new RedisReportCache(redis as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores dashboard payload with scoped key and TTL', async () => {
    const entry = {
      payload: {
        todayDueCount: 1,
        todayDueAmountRial: '1000',
        overdueCount: 0,
        overdueAmountRial: '0',
        pendingPaymentCount: 0,
        todayCollectedRial: '0',
        thisMonthCollectedRial: '0',
        activeSalesCount: 2,
        customersWithDebtCount: 0,
        updatedAt: '2025-01-15T09:00:00.000Z',
      },
      expiresAt: '2025-01-15T09:05:00.000Z',
    };

    await cache.setDashboard('tenant-1', 'all', entry, 300);

    expect(redis.client.set).toHaveBeenCalledWith(
      'report:tenant-1:dashboard:all',
      JSON.stringify(entry),
      'EX',
      300,
    );
  });

  it('invalidates all dashboard keys for tenant', async () => {
    redis.client.scan
      .mockResolvedValueOnce(['1', ['report:tenant-1:dashboard:all']])
      .mockResolvedValueOnce(['0', []]);

    await cache.invalidateTenantDashboard('tenant-1');

    expect(redis.client.del).toHaveBeenCalledWith('report:tenant-1:dashboard:all');
  });
});
