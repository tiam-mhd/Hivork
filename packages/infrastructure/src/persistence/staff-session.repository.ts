import type {
  IDeviceLabelParser,
  IStaffSessionRepository,
  ListStaffSessionsOptions,
  ListStaffSessionsResult,
  StaffSessionListItem,
  StaffSessionListStatusFilter,
} from '@hivork/application';
import { decodeStaffSessionCursor, encodeStaffSessionCursor } from '@hivork/application';
import { StaffSession } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { Prisma, SessionStatus } from '@prisma/client';
import { UAParser } from 'ua-parser-js';

import {
  runWithBypassSoftDelete,
  runWithBypassStaffSessionActive,
} from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  staffSessionToCreateData,
  staffSessionToDomain,
  staffSessionToUpdateData,
} from './mappers/staff-session.mapper.js';

@Injectable()
export class UaParserDeviceLabelService implements IDeviceLabelParser {
  parse(userAgent?: string): string | null {
    if (!userAgent?.trim()) {
      return null;
    }

    const parsed = new UAParser(userAgent).getResult();
    const browser = parsed.browser.name ?? 'مرورگر';
    const os = parsed.os.name ?? 'دستگاه';
    const label = `${browser} — ${os}`;
    return label.length > 120 ? `${label.slice(0, 117)}...` : label;
  }
}

function toListItem(row: {
  id: string;
  tenantId: string;
  staffId: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  rememberMe: boolean;
  status: SessionStatus;
  refreshTokenHash: string;
}): StaffSessionListItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    staffId: row.staffId,
    deviceLabel: row.deviceLabel,
    ipAddress: row.ipAddress,
    lastActiveAt: row.lastActiveAt,
    createdAt: row.createdAt,
    rememberMe: row.rememberMe,
    status: row.status,
    refreshTokenHash: row.refreshTokenHash,
  };
}

function buildStatusWhere(
  status: StaffSessionListStatusFilter,
  now: Date,
): Prisma.StaffSessionWhereInput {
  if (status === 'active') {
    return {
      status: 'active',
      revokedAt: null,
      expiresAt: { gt: now },
    };
  }
  if (status === 'revoked') {
    return { status: 'revoked' };
  }
  if (status === 'expired') {
    return { status: 'expired' };
  }
  return {};
}

@Injectable()
export class PrismaStaffSessionRepository implements IStaffSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(session: StaffSession, createdById?: string): Promise<void> {
    await this.prisma.staffSession.create({
      data: staffSessionToCreateData(session, createdById),
    });
  }

  async findActiveByRefreshTokenHash(refreshTokenHash: string): Promise<StaffSession | null> {
    const row = await this.prisma.staffSession.findFirst({
      where: {
        refreshTokenHash,
        status: 'active',
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return row ? staffSessionToDomain(row) : null;
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<StaffSession | null> {
    return runWithBypassStaffSessionActive(async () => {
      const row = await this.prisma.staffSession.findFirst({
        where: { refreshTokenHash },
      });
      return row ? staffSessionToDomain(row) : null;
    });
  }

  async findByIdForStaff(
    tenantId: string,
    staffId: string,
    sessionId: string,
  ): Promise<StaffSession | null> {
    return runWithBypassStaffSessionActive(async () => {
      const row = await this.prisma.staffSession.findFirst({
        where: { id: sessionId, tenantId, staffId },
      });
      return row ? staffSessionToDomain(row) : null;
    });
  }

  async listForStaff(options: ListStaffSessionsOptions): Promise<ListStaffSessionsResult> {
    const status = options.status ?? 'active';
    const now = new Date();
    const limit = options.limit;
    const cursorPayload = options.cursor
      ? decodeStaffSessionCursor(options.cursor)
      : undefined;

    const listQuery = async (): Promise<ListStaffSessionsResult> => {
      const where: Prisma.StaffSessionWhereInput = {
        tenantId: options.tenantId,
        staffId: options.staffId,
        ...buildStatusWhere(status, now),
        ...(cursorPayload
          ? {
              OR: [
                { lastActiveAt: { lt: new Date(cursorPayload.lastActiveAt) } },
                {
                  lastActiveAt: new Date(cursorPayload.lastActiveAt),
                  id: { lt: cursorPayload.id },
                },
              ],
            }
          : {}),
      };

      const rows = await this.prisma.staffSession.findMany({
        where,
        orderBy: [{ lastActiveAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });

      const hasNext = rows.length > limit;
      const page = hasNext ? rows.slice(0, limit) : rows;

      return {
        items: page.map(toListItem),
        hasNext,
      };
    };

    if (status === 'active') {
      return listQuery();
    }

    return runWithBypassStaffSessionActive(listQuery);
  }

  async touchActiveSession(
    refreshTokenHash: string,
    now: Date,
    nextExpiresAt?: Date,
  ): Promise<void> {
    const existing = await this.findActiveByRefreshTokenHash(refreshTokenHash);
    if (!existing) {
      return;
    }

    existing.touch(now, nextExpiresAt);
    await this.prisma.staffSession.update({
      where: { id: existing.id },
      data: staffSessionToUpdateData(existing),
    });
  }

  async rotateActiveSessionRefreshHash(
    currentHash: string,
    newHash: string,
    now: Date,
    expiresAt: Date,
  ) {
    const existing = await this.findActiveByRefreshTokenHash(currentHash);
    if (!existing) {
      return null;
    }

    existing.rotateRefresh(newHash, now, expiresAt);
    await this.prisma.staffSession.update({
      where: { id: existing.id },
      data: staffSessionToUpdateData(existing),
    });
    return existing;
  }

  async saveRevoked(session: StaffSession, updatedById?: string): Promise<void> {
    await runWithBypassStaffSessionActive(async () => {
      await this.prisma.staffSession.update({
        where: { id: session.id },
        data: staffSessionToUpdateData(session, updatedById),
      });
    });
  }

  async countActiveForStaff(tenantId: string, staffId: string): Promise<number> {
    return this.prisma.staffSession.count({
      where: {
        tenantId,
        staffId,
        status: 'active',
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeOldestActiveSessions(
    tenantId: string,
    staffId: string,
    revokeCount: number,
    actorId: string,
    reason: string,
  ): Promise<void> {
    if (revokeCount <= 0) {
      return;
    }

    const rows = await this.prisma.staffSession.findMany({
      where: {
        tenantId,
        staffId,
        status: 'active',
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'asc' },
      take: revokeCount,
    });

    const now = new Date();
    for (const row of rows) {
      const session = staffSessionToDomain(row);
      session.revoke(actorId, reason, now);
      await this.saveRevoked(session, actorId);
    }
  }

  async revokeAllActiveForStaff(
    tenantId: string,
    staffId: string,
    actorId: string,
    reason: string,
    excludeRefreshTokenHash?: string,
  ): Promise<number> {
    const rows = await this.prisma.staffSession.findMany({
      where: {
        tenantId,
        staffId,
        status: 'active',
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(excludeRefreshTokenHash
          ? { refreshTokenHash: { not: excludeRefreshTokenHash } }
          : {}),
      },
    });

    const now = new Date();
    for (const row of rows) {
      const session = staffSessionToDomain(row);
      session.revoke(actorId, reason, now);
      await this.saveRevoked(session, actorId);
    }

    return rows.length;
  }

  async revokeAllActiveForUser(userId: string, actorId: string, reason: string): Promise<number> {
    const sessions = await this.findAllActiveForUser(userId);
    const now = new Date();

    for (const session of sessions) {
      session.revoke(actorId, reason, now);
      await this.saveRevoked(session, actorId);
    }

    return sessions.length;
  }

  async findAllActiveForUser(userId: string): Promise<StaffSession[]> {
    const rows = await this.prisma.staffSession.findMany({
      where: {
        userId,
        status: 'active',
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return rows.map(staffSessionToDomain);
  }

  async findAllActiveForStaff(tenantId: string, staffId: string): Promise<StaffSession[]> {
    const rows = await this.prisma.staffSession.findMany({
      where: {
        tenantId,
        staffId,
        status: 'active',
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return rows.map(staffSessionToDomain);
  }

  async markExpiredSessions(before: Date): Promise<number> {
    return runWithBypassSoftDelete(async () => {
      const result = await this.prisma.staffSession.updateMany({
        where: {
          status: 'active',
          expiresAt: { lt: before },
          deletedAt: null,
        },
        data: {
          status: 'expired',
          updatedAt: before,
        },
      });
      return result.count;
    });
  }
}

@Injectable()
export class ExpireStaffSessionsService {
  constructor(private readonly staffSessions: PrismaStaffSessionRepository) {}

  async run(): Promise<number> {
    return this.staffSessions.markExpiredSessions(new Date());
  }
}

export { encodeStaffSessionCursor };
