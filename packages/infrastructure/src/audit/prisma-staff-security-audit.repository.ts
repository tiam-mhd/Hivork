import type {
  IStaffSecurityAuditRepository,
  ListStaffSecurityAuditOptions,
  ListStaffSecurityAuditResult,
  StaffSecurityAuditListItem,
} from '@hivork/application';
import {
  decodeStaffSecurityAuditCursor,
  STAFF_SECURITY_AUDIT_ACTIONS,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaStaffSecurityAuditRepository implements IStaffSecurityAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForStaff(options: ListStaffSecurityAuditOptions): Promise<ListStaffSecurityAuditResult> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: options.tenantId,
      actorType: 'staff',
      actorId: options.staffId,
      action: { in: [...STAFF_SECURITY_AUDIT_ACTIONS] },
    };

    if (options.cursor) {
      const decoded = decodeStaffSecurityAuditCursor(options.cursor);
      where.OR = [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        {
          AND: [{ createdAt: new Date(decoded.createdAt) }, { id: { lt: decoded.id } }],
        },
      ];
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
      select: {
        id: true,
        action: true,
        createdAt: true,
        ip: true,
        metadata: true,
      },
    });

    const hasNext = rows.length > options.limit;
    const slice = hasNext ? rows.slice(0, options.limit) : rows;

    const items: StaffSecurityAuditListItem[] = slice.map((row) => ({
      id: row.id,
      action: row.action,
      createdAt: row.createdAt,
      ipAddress: row.ip ?? null,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : undefined,
    }));

    return { items, hasNext };
  }
}
