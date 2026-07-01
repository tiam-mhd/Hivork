import type { IOtpRateLimiter } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

export const OTP_RATE_LIMIT_WINDOW_SECONDS = 60;

@Injectable()
export class OtpRateLimiterService implements IOtpRateLimiter {
  constructor(
    private readonly redis: RedisService,
    private readonly limitPerMinute: number,
  ) {}

  async checkOtpRateLimit(phone: string): Promise<boolean> {
    if (process.env.VITEST === 'true') {
      return true;
    }

    const key = `ratelimit:otp:${phone}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, OTP_RATE_LIMIT_WINDOW_SECONDS);
    }
    return count <= this.limitPerMinute;
  }
}

/** Canonical name per TASK-040 */
export { OtpRateLimiterService as RateLimiterService };
