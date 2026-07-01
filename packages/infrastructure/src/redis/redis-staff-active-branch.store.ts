import type { IStaffActiveBranchStore } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisStaffActiveBranchStore implements IStaffActiveBranchStore {
  constructor(private readonly redis: RedisService) {}

  async get(staffId: string): Promise<string | null> {
    return this.redis.client.get(this.key(staffId));
  }

  async set(staffId: string, branchId: string | null, ttlSeconds: number): Promise<void> {
    const key = this.key(staffId);
    if (branchId === null) {
      await this.redis.client.del(key);
      return;
    }

    await this.redis.client.set(key, branchId, 'EX', ttlSeconds);
  }

  private key(staffId: string): string {
    return `staff:${staffId}:active_branch`;
  }
}
