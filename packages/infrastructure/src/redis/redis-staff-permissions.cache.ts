import type { IStaffPermissionsCache } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisStaffPermissionsCache implements IStaffPermissionsCache {
  constructor(private readonly redis: RedisService) {}

  async get(staffId: string): Promise<string[] | null> {
    const raw = await this.redis.client.get(this.key(staffId));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null;
    } catch {
      return null;
    }
  }

  async set(staffId: string, permissions: string[], ttlSeconds: number): Promise<void> {
    await this.redis.client.set(this.key(staffId), JSON.stringify(permissions), 'EX', ttlSeconds);
  }

  private key(staffId: string): string {
    return `staff:${staffId}:permissions`;
  }
}
