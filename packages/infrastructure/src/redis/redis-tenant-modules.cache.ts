import type { TenantModulesCache } from '@hivork/module-core';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisTenantModulesCache implements TenantModulesCache {
  constructor(private readonly redis: RedisService) {}

  async get(tenantId: string): Promise<string[] | null> {
    const raw = await this.redis.client.get(this.key(tenantId));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : null;
    } catch {
      return null;
    }
  }

  async set(tenantId: string, modules: string[], ttlSeconds: number): Promise<void> {
    await this.redis.client.set(this.key(tenantId), JSON.stringify(modules), 'EX', ttlSeconds);
  }

  private key(tenantId: string): string {
    return `tenant:${tenantId}:enabled_modules`;
  }
}
