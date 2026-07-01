import {
  API_KEY_RATE_LIMIT,
  API_KEY_RATE_WINDOW_SECONDS,
  type IApiKeyRateLimiterPort,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class ApiKeyRateLimiterService implements IApiKeyRateLimiterPort {
  constructor(private readonly redis: RedisService) {}

  async checkAndRecord(apiKeyId: string): Promise<boolean> {
    if (process.env.VITEST === 'true') {
      return true;
    }

    const key = `ratelimit:apikey:${apiKeyId}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, API_KEY_RATE_WINDOW_SECONDS);
    }
    return count <= API_KEY_RATE_LIMIT;
  }
}
