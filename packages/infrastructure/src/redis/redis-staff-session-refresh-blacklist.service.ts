import type { IStaffSessionRefreshBlacklistPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisStaffSessionRefreshBlacklistService implements IStaffSessionRefreshBlacklistPort {
  constructor(private readonly redis: RedisService) {}

  async revokeByHash(refreshTokenHash: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      return;
    }
    await this.redis.client.set(this.key(refreshTokenHash), '1', 'EX', ttlSeconds);
  }

  async isRevokedByHash(refreshTokenHash: string): Promise<boolean> {
    const value = await this.redis.client.get(this.key(refreshTokenHash));
    return value !== null;
  }

  private key(refreshTokenHash: string): string {
    return `session:revoked:${refreshTokenHash}`;
  }
}
