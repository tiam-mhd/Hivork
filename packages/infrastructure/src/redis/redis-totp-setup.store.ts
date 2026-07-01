import {
  TOTP_SETUP_TTL_SECONDS,
  type ITotpSetupStorePort,
  type TotpSetupPending,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

const KEY_PREFIX = 'mfa:totp:setup:';

type StoredPending = {
  secretEncrypted: string;
  expiresAt: string;
};

@Injectable()
export class RedisTotpSetupStore implements ITotpSetupStorePort {
  constructor(private readonly redis: RedisService) {}

  async save(userId: string, pending: TotpSetupPending): Promise<void> {
    const payload: StoredPending = {
      secretEncrypted: pending.secretEncrypted,
      expiresAt: pending.expiresAt.toISOString(),
    };
    await this.redis.client.setex(
      this.key(userId),
      TOTP_SETUP_TTL_SECONDS,
      JSON.stringify(payload),
    );
  }

  async get(userId: string): Promise<TotpSetupPending | null> {
    const raw = await this.redis.client.get(this.key(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredPending;
    return {
      secretEncrypted: parsed.secretEncrypted,
      expiresAt: new Date(parsed.expiresAt),
    };
  }

  async delete(userId: string): Promise<void> {
    await this.redis.client.del(this.key(userId));
  }

  private key(userId: string): string {
    return `${KEY_PREFIX}${userId}`;
  }
}
