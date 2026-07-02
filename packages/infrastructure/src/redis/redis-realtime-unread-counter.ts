import type { IRealtimeUnreadCounter } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisRealtimeUnreadCounter implements IRealtimeUnreadCounter {
  constructor(private readonly redis: RedisService) {}

  async increment(tenantId: string, staffId: string): Promise<number> {
    return this.redis.client.incr(this.key(tenantId, staffId));
  }

  async get(tenantId: string, staffId: string): Promise<number> {
    const value = await this.redis.client.get(this.key(tenantId, staffId));
    if (!value) {
      return 0;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async reset(tenantId: string, staffId: string): Promise<void> {
    await this.redis.client.del(this.key(tenantId, staffId));
  }

  private key(tenantId: string, staffId: string): string {
    return `realtime:unread:${tenantId}:${staffId}`;
  }
}
