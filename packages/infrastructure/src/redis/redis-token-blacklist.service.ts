import { createHash } from 'node:crypto';

import type { ITokenBlacklistPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisTokenBlacklistService implements ITokenBlacklistPort {
  constructor(private readonly redis: RedisService) {}

  async revoke(token: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.client.set(this.key(token), '1', 'EX', ttlSeconds);
  }

  async isRevoked(token: string): Promise<boolean> {
    const value = await this.redis.client.get(this.key(token));
    return value !== null;
  }

  private key(token: string): string {
    const digest = createHash('sha256').update(token).digest('hex');
    return `token:blacklist:${digest}`;
  }
}
