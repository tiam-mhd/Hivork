import {
  type ITenantSequenceRepository,
  type OutboxTransaction,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type TenantSequenceClient = Pick<PrismaService, '$queryRaw' | '$executeRaw'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): TenantSequenceClient {
  return (tx ?? prisma) as TenantSequenceClient;
}

@Injectable()
export class PrismaTenantSequenceRepository implements ITenantSequenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async peekNextValue(
    tenantId: string,
    sequenceKey: string,
    tx?: OutboxTransaction,
  ): Promise<number> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.$queryRaw<Array<{ next_value: number }>>`
      SELECT next_value
      FROM tenant_sequences
      WHERE tenant_id = ${tenantId}::uuid
        AND sequence_key = ${sequenceKey}
      LIMIT 1
    `;

    return rows[0]?.next_value ?? 1;
  }

  async allocateNextValue(
    tenantId: string,
    sequenceKey: string,
    tx?: OutboxTransaction,
  ): Promise<number> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.$queryRaw<Array<{ allocated_value: number }>>`
      INSERT INTO tenant_sequences (
        id,
        tenant_id,
        sequence_key,
        next_value,
        created_at,
        updated_at,
        version
      )
      VALUES (
        gen_random_uuid(),
        ${tenantId}::uuid,
        ${sequenceKey},
        2,
        NOW(),
        NOW(),
        1
      )
      ON CONFLICT (tenant_id, sequence_key)
      DO UPDATE SET
        next_value = tenant_sequences.next_value + 1,
        updated_at = NOW(),
        version = tenant_sequences.version + 1
      RETURNING next_value - 1 AS allocated_value
    `;

    const allocated = rows[0]?.allocated_value;
    if (!allocated || allocated < 1) {
      throw new Error('Failed to allocate tenant sequence value.');
    }

    return allocated;
  }
}
