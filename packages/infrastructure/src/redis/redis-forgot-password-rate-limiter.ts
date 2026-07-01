import {
  FORGOT_PASSWORD_IP_LIMIT,
  FORGOT_PASSWORD_IP_WINDOW_SECONDS,
  FORGOT_PASSWORD_PHONE_LIMIT,
  FORGOT_PASSWORD_PHONE_WINDOW_SECONDS,
  RESET_PASSWORD_IP_LIMIT,
  RESET_PASSWORD_IP_WINDOW_SECONDS,
  type IForgotPasswordRateLimiterPort,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisForgotPasswordRateLimiter implements IForgotPasswordRateLimiterPort {
  constructor(private readonly redis: RedisService) {}

  async checkRequestAllowed(phone: string, clientIp?: string): Promise<boolean> {
    if (process.env.VITEST === 'true') {
      return true;
    }

    const phoneAllowed = await this.incrementWithinLimit(
      `ratelimit:forgot:phone:${phone}`,
      FORGOT_PASSWORD_PHONE_LIMIT,
      FORGOT_PASSWORD_PHONE_WINDOW_SECONDS,
    );
    if (!phoneAllowed) {
      return false;
    }

    if (!clientIp) {
      return true;
    }

    return this.incrementWithinLimit(
      `ratelimit:forgot:ip:${clientIp}`,
      FORGOT_PASSWORD_IP_LIMIT,
      FORGOT_PASSWORD_IP_WINDOW_SECONDS,
    );
  }

  async checkResetAllowed(clientIp?: string): Promise<boolean> {
    if (process.env.VITEST === 'true' || !clientIp) {
      return true;
    }

    return this.incrementWithinLimit(
      `ratelimit:reset:ip:${clientIp}`,
      RESET_PASSWORD_IP_LIMIT,
      RESET_PASSWORD_IP_WINDOW_SECONDS,
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
