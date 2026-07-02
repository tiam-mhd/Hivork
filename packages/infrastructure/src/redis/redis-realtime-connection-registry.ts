import type { IRealtimeConnectionRegistry } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

const CONNECTION_TTL_SECONDS = 90;

@Injectable()
export class RedisRealtimeConnectionRegistry implements IRealtimeConnectionRegistry {
  constructor(private readonly redis: RedisService) {}

  async tryAcquire(tenantId: string, staffId: string, connectionId: string): Promise<boolean> {
    const key = this.key(tenantId, staffId);
    const result = await this.redis.client.set(
      key,
      connectionId,
      'EX',
      CONNECTION_TTL_SECONDS,
      'NX',
    );
    if (result === 'OK') {
      return true;
    }
    const existing = await this.redis.client.get(key);
    return existing === connectionId;
  }

  async refresh(tenantId: string, staffId: string, connectionId: string): Promise<void> {
    const key = this.key(tenantId, staffId);
    const existing = await this.redis.client.get(key);
    if (existing === connectionId) {
      await this.redis.client.expire(key, CONNECTION_TTL_SECONDS);
    }
  }

  async release(tenantId: string, staffId: string, connectionId: string): Promise<void> {
    const key = this.key(tenantId, staffId);
    const existing = await this.redis.client.get(key);
    if (existing === connectionId) {
      await this.redis.client.del(key);
    }
  }

  private key(tenantId: string, staffId: string): string {
    return `realtime:conn:${tenantId}:${staffId}`;
  }
}
