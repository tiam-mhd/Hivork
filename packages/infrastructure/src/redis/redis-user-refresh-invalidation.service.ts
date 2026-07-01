import type {
  IUserRefreshInvalidationPort,
  IUserSessionRevocationPort,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisUserRefreshInvalidationService implements IUserRefreshInvalidationPort {
  constructor(private readonly redis: RedisService) {}

  async getInvalidBefore(userId: string): Promise<number | null> {
    const raw = await this.redis.client.get(this.key(userId));
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async invalidateAllForUser(userId: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      return;
    }
    await this.redis.client.set(this.key(userId), String(Date.now()), 'EX', ttlSeconds);
  }

  private key(userId: string): string {
    return `user:refresh:invalid_before:${userId}`;
  }
}

/** Placeholder until IFP-009 StaffSession persistence. */
@Injectable()
export class NoopUserSessionRevocationPort implements IUserSessionRevocationPort {
  async revokeAllSessionsForUser(_userId: string): Promise<void> {
    // IFP-009 will revoke StaffSession rows + refresh blacklist per session.
  }
}
