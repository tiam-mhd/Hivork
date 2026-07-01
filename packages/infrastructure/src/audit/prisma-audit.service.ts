import type { AuditFindQuery, AuditLogInput, AuditLogRecord, AuditService, OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { getTenantId } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

@Injectable()
export class PrismaAuditService implements AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogInput, tx?: OutboxTransaction): Promise<void> {
    const client = (tx ?? this.prisma) as Pick<PrismaService, 'auditLog'>;

    await client.auditLog.create({
      data: {
        tenantId: entry.tenantId ?? getTenantId(),
        actorType: entry.actorType,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: toJsonValue(entry.oldValue),
        newValue: toJsonValue(entry.newValue),
        ip: entry.ip,
        userAgent: entry.userAgent,
        metadata: toJsonValue(entry.metadata),
      },
    });
  }

  async find(query: AuditFindQuery): Promise<AuditLogRecord[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(query.tenantId ? { tenantId: query.tenantId } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.action ? { action: query.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId ?? undefined,
      actorType: row.actorType,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      oldValue: row.oldValue ?? undefined,
      newValue: row.newValue ?? undefined,
      ip: row.ip ?? undefined,
      userAgent: row.userAgent ?? undefined,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : undefined,
      createdAt: row.createdAt,
    }));
  }

  /** @deprecated Use log */
  async append(entry: AuditLogInput): Promise<void> {
    await this.log(entry);
  }
}
