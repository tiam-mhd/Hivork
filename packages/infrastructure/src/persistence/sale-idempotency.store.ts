import type {
  ISaleIdempotencyStore,
  OutboxTransaction,
  SaleIdempotencyCachedRecord,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

type IdempotencyWriteClient = Pick<PrismaService, 'idempotencyRecord'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): IdempotencyWriteClient {
  return (tx ?? prisma) as IdempotencyWriteClient;
}

@Injectable()
export class PrismaSaleIdempotencyStore implements ISaleIdempotencyStore {
  constructor(private readonly prisma: PrismaService) {}

  async find(tenantId: string, idempotencyKey: string): Promise<SaleIdempotencyCachedRecord | null> {
    const row = await this.prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: idempotencyKey,
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      requestHash: row.requestHash,
      response: row.response as Record<string, unknown>,
    };
  }

  async store(
    tenantId: string,
    idempotencyKey: string,
    requestHash: string,
    response: Record<string, unknown>,
    tx?: OutboxTransaction,
  ): Promise<void> {
    const client = resolveClient(this.prisma, tx);

    await client.idempotencyRecord.create({
      data: {
        tenantId,
        key: idempotencyKey,
        requestHash,
        response: response as Prisma.InputJsonValue,
      },
    });
  }
}
