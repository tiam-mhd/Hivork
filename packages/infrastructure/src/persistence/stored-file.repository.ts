import type {
  CreateStoredFileInput,
  IStoredFileRepository,
  StoredFileRecord,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction) {
  return (tx ?? prisma) as Pick<PrismaService, 'storedFile'>;
}

function toRecord(row: {
  id: string;
  tenantId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata: unknown;
}): StoredFileRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storageKey: row.storageKey,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    category: row.category,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

@Injectable()
export class PrismaStoredFileRepository implements IStoredFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateStoredFileInput, tx?: OutboxTransaction): Promise<StoredFileRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.storedFile.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        category: input.category ?? null,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    return toRecord(row);
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<StoredFileRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.storedFile.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }
}
