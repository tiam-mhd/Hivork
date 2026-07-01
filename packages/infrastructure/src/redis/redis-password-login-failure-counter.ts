import {
  type IPasswordLoginFailureCounterPort,
  PASSWORD_LOGIN_FAILURE_WINDOW_SECONDS,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisPasswordLoginFailureCounter implements IPasswordLoginFailureCounterPort {
  constructor(private readonly redis: RedisService) {}

  async getCount(clientIp: string): Promise<number> {
    const key = this.key(clientIp);
    const value = await this.redis.client.get(key);
    return value ? Number.parseInt(value, 10) : 0;
  }

  async recordFailure(clientIp: string): Promise<number> {
    const key = this.key(clientIp);
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, PASSWORD_LOGIN_FAILURE_WINDOW_SECONDS);
    }
    return count;
  }

  private key(clientIp: string): string {
    return `auth:password_failures:${clientIp}`;
  }
}
