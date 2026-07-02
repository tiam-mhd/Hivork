import { ApplicationError, EXPORT_RATE_LIMIT_PER_HOUR, type IExportRateLimiterPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

const WINDOW_SECONDS = 3_600;

@Injectable()
export class RedisExportRateLimiterService implements IExportRateLimiterPort {
  constructor(private readonly redis: RedisService) {}

  async assertWithinLimit(staffId: string): Promise<void> {
    const key = `ratelimit:export:staff:${staffId}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, WINDOW_SECONDS);
    }

    if (count > EXPORT_RATE_LIMIT_PER_HOUR) {
      throw new ApplicationError(
        'TOO_MANY_REQUESTS',
        'Too many export requests. Please try again later.',
        429,
      );
    }
  }
}
