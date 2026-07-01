import type { IRegisterRateLimiter } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

export const REGISTER_RATE_LIMIT_WINDOW_SECONDS = 3_600;

@Injectable()
export class RegisterRateLimiterService implements IRegisterRateLimiter {
  constructor(
    private readonly redis: RedisService,
    private readonly limitPerHour: number,
  ) {}

  async checkRegisterRateLimit(clientIp: string): Promise<boolean> {
    if (process.env.VITEST === 'true') {
      return true;
    }

    const key = `ratelimit:register:${clientIp}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, REGISTER_RATE_LIMIT_WINDOW_SECONDS);
    }
    return count <= this.limitPerHour;
  }
}
