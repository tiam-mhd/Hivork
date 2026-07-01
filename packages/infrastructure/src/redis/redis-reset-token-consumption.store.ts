import type { IResetTokenConsumptionPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisResetTokenConsumptionStore implements IResetTokenConsumptionPort {
  constructor(private readonly redis: RedisService) {}

  async isConsumed(jti: string): Promise<boolean> {
    const value = await this.redis.client.get(this.key(jti));
    return value !== null;
  }

  async markConsumed(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      return;
    }
    await this.redis.client.set(this.key(jti), '1', 'EX', ttlSeconds);
  }

  private key(jti: string): string {
    return `reset:token:${jti}`;
  }
}
