import type { PrintSnapshotRecord } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

const KEY_PREFIX = 'print:snapshot:';

type StoredSnapshot = {
  tenantId: string;
  staffId: string;
  payload: PrintSnapshotRecord['payload'];
  expiresAt: string;
};

@Injectable()
export class RedisPrintSnapshotStore {
  constructor(private readonly redis: RedisService) {}

  async save(token: string, record: PrintSnapshotRecord, ttlSeconds: number): Promise<void> {
    const payload: StoredSnapshot = {
      tenantId: record.tenantId,
      staffId: record.staffId,
      payload: record.payload,
      expiresAt: record.expiresAt.toISOString(),
    };

    await this.redis.client.setex(this.key(token), ttlSeconds, JSON.stringify(payload));
  }

  async get(token: string): Promise<PrintSnapshotRecord | null> {
    const raw = await this.redis.client.get(this.key(token));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredSnapshot;
    return {
      tenantId: parsed.tenantId,
      staffId: parsed.staffId,
      payload: parsed.payload,
      expiresAt: new Date(parsed.expiresAt),
    };
  }

  private key(token: string): string {
    return `${KEY_PREFIX}${token}`;
  }
}
