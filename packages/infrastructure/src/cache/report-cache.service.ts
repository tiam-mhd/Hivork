import type { CachedDashboardEntry, IReportCache } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class RedisReportCache implements IReportCache {
  constructor(private readonly redis: RedisService) {}

  async getDashboard(tenantId: string, scopeHash: string): Promise<CachedDashboardEntry | null> {
    const raw = await this.redis.client.get(this.dashboardKey(tenantId, scopeHash));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedDashboardEntry;
      if (!parsed?.payload || !parsed.expiresAt) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async setDashboard(
    tenantId: string,
    scopeHash: string,
    entry: CachedDashboardEntry,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.client.set(
      this.dashboardKey(tenantId, scopeHash),
      JSON.stringify(entry),
      'EX',
      ttlSeconds,
    );
  }

  async invalidateTenantDashboard(tenantId: string): Promise<void> {
    const pattern = `report:${tenantId}:dashboard:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  private dashboardKey(tenantId: string, scopeHash: string): string {
    return `report:${tenantId}:dashboard:${scopeHash}`;
  }
}
