import type {
  CreateTenantApiKeyRecordInput,
  ITenantApiKeyRepository,
  ListTenantApiKeysOptions,
  ListTenantApiKeysResult,
  TenantApiKeyListItem,
  TenantApiKeyRecord,
} from '@hivork/application';
import { decodeTenantApiKeyCursor } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { ApiKeyStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  version: number;
}): TenantApiKeyRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    keyHash: row.keyHash,
    scopes: row.scopes,
    status: row.status,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    lastUsedIp: row.lastUsedIp,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    version: row.version,
  };
}

function toListItem(row: {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  createdAt: Date;
}): TenantApiKeyListItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes,
    status: row.status,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    lastUsedIp: row.lastUsedIp,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaTenantApiKeyRepository implements ITenantApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countActiveForTenant(tenantId: string): Promise<number> {
    const now = new Date();
    return this.prisma.tenantApiKey.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const row = await this.prisma.tenantApiKey.findFirst({
      where: { tenantId, name, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }

  async create(input: CreateTenantApiKeyRecordInput): Promise<TenantApiKeyRecord> {
    const row = await this.prisma.tenantApiKey.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        createdById: input.createdById,
        status: 'active',
      },
    });
    return toRecord(row);
  }

  async findByIdForTenant(tenantId: string, id: string): Promise<TenantApiKeyRecord | null> {
    const row = await this.prisma.tenantApiKey.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    return row ? toRecord(row) : null;
  }

  async findByKeyHash(keyHash: string): Promise<TenantApiKeyRecord | null> {
    const row = await this.prisma.tenantApiKey.findFirst({
      where: { keyHash, deletedAt: null },
    });
    return row ? toRecord(row) : null;
  }

  async listForTenant(options: ListTenantApiKeysOptions): Promise<ListTenantApiKeysResult> {
    const where: Prisma.TenantApiKeyWhereInput = {
      tenantId: options.tenantId,
      deletedAt: null,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.cursor) {
      const decoded = decodeTenantApiKeyCursor(options.cursor);
      where.OR = [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        {
          AND: [
            { createdAt: new Date(decoded.createdAt) },
            { id: { lt: decoded.id } },
          ],
        },
      ];
    }

    const rows = await this.prisma.tenantApiKey.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
      select: {
        id: true,
        tenantId: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        createdAt: true,
      },
    });

    const hasNext = rows.length > options.limit;
    const items = (hasNext ? rows.slice(0, options.limit) : rows).map(toListItem);
    return { items, hasNext };
  }

  async revoke(
    tenantId: string,
    id: string,
    actorId: string,
    reason?: string,
  ): Promise<TenantApiKeyRecord | null> {
    const existing = await this.findByIdForTenant(tenantId, id);
    if (!existing) {
      return null;
    }

    if (existing.status === 'revoked') {
      return existing;
    }

    const now = new Date();
    const row = await this.prisma.tenantApiKey.update({
      where: { id },
      data: {
        status: 'revoked',
        deletedAt: now,
        deletedById: actorId,
        deleteReason: reason ?? 'revoked',
        updatedById: actorId,
        version: { increment: 1 },
      },
    });

    return toRecord(row);
  }

  async touchUsage(id: string, usedAt: Date, ip?: string): Promise<void> {
    await this.prisma.tenantApiKey.update({
      where: { id },
      data: {
        lastUsedAt: usedAt,
        ...(ip ? { lastUsedIp: ip.slice(0, 45) } : {}),
      },
    });
  }

  async markExpiredKeys(before: Date): Promise<number> {
    const result = await this.prisma.tenantApiKey.updateMany({
      where: {
        deletedAt: null,
        status: 'active',
        expiresAt: { lte: before },
      },
      data: {
        status: 'expired',
        updatedAt: before,
      },
    });
    return result.count;
  }
}
