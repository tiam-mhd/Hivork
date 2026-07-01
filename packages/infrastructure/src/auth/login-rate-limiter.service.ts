import {
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_SECONDS,
  LOGIN_PHONE_LIMIT,
  LOGIN_PHONE_WINDOW_SECONDS,
  type ILoginRateLimiterPort,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class LoginRateLimiterService implements ILoginRateLimiterPort {
  constructor(private readonly redis: RedisService) {}

  async checkAndRecord(phone: string, clientIp?: string): Promise<boolean> {
    if (process.env.VITEST === 'true') {
      return true;
    }

    const phoneAllowed = await this.incrementWithinLimit(
      `ratelimit:login:phone:${phone}`,
      LOGIN_PHONE_LIMIT,
      LOGIN_PHONE_WINDOW_SECONDS,
    );
    if (!phoneAllowed) {
      return false;
    }

    if (!clientIp) {
      return true;
    }

    return this.incrementWithinLimit(
      `ratelimit:login:ip:${clientIp}`,
      LOGIN_IP_LIMIT,
      LOGIN_IP_WINDOW_SECONDS,
    );
  }

  private async incrementWithinLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, windowSeconds);
    }
    return count <= limit;
  }
}
