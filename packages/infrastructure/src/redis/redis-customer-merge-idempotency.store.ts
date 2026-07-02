import type {
  CustomerMergeIdempotencyResult,
  ICustomerMergeIdempotencyStore,
} from '@hivork/application';
import { CUSTOMER_MERGE_IDEMPOTENCY_TTL_SECONDS } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class RedisCustomerMergeIdempotencyStore implements ICustomerMergeIdempotencyStore {
  constructor(private readonly redis: RedisService) {}

  async find(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<{ requestHash: string; response: CustomerMergeIdempotencyResult } | null> {
    const raw = await this.redis.client.get(this.key(tenantId, idempotencyKey));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as {
        requestHash?: string;
        response?: CustomerMergeIdempotencyResult;
      };

      if (!parsed.requestHash || !parsed.response) {
        return null;
      }

      return {
        requestHash: parsed.requestHash,
        response: parsed.response,
      };
    } catch {
      return null;
    }
  }

  async store(
    tenantId: string,
    idempotencyKey: string,
    requestHash: string,
    response: CustomerMergeIdempotencyResult,
  ): Promise<void> {
    await this.redis.client.set(
      this.key(tenantId, idempotencyKey),
      JSON.stringify({ requestHash, response }),
      'EX',
      CUSTOMER_MERGE_IDEMPOTENCY_TTL_SECONDS,
    );
  }

  private key(tenantId: string, idempotencyKey: string): string {
    return `customer-merge:${tenantId}:${idempotencyKey}`;
  }
}
