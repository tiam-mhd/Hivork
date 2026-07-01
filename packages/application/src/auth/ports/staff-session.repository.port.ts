import type { SessionStatus, StaffSession } from '@hivork/domain';

export type StaffSessionListStatusFilter = 'active' | 'revoked' | 'expired' | 'all';

export type StaffSessionListItem = {
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
};

export type ListStaffSessionsOptions = {
  tenantId: string;
  staffId: string;
  cursor?: string;
  limit: number;
  status?: StaffSessionListStatusFilter;
};

export type ListStaffSessionsResult = {
  items: StaffSessionListItem[];
  hasNext: boolean;
};

export interface IStaffSessionRepository {
  create(session: StaffSession, createdById?: string): Promise<void>;
  findActiveByRefreshTokenHash(refreshTokenHash: string): Promise<StaffSession | null>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<StaffSession | null>;
  findByIdForStaff(tenantId: string, staffId: string, sessionId: string): Promise<StaffSession | null>;
  listForStaff(options: ListStaffSessionsOptions): Promise<ListStaffSessionsResult>;
  touchActiveSession(
    refreshTokenHash: string,
    now: Date,
    nextExpiresAt?: Date,
  ): Promise<void>;
  rotateActiveSessionRefreshHash(
    currentHash: string,
    newHash: string,
    now: Date,
    expiresAt: Date,
  ): Promise<StaffSession | null>;
  saveRevoked(session: StaffSession, updatedById?: string): Promise<void>;
  countActiveForStaff(tenantId: string, staffId: string): Promise<number>;
  revokeOldestActiveSessions(
    tenantId: string,
    staffId: string,
    revokeCount: number,
    actorId: string,
    reason: string,
  ): Promise<void>;
  revokeAllActiveForStaff(
    tenantId: string,
    staffId: string,
    actorId: string,
    reason: string,
    excludeRefreshTokenHash?: string,
  ): Promise<number>;
  revokeAllActiveForUser(userId: string, actorId: string, reason: string): Promise<number>;
  findAllActiveForUser(userId: string): Promise<StaffSession[]>;
  findAllActiveForStaff(tenantId: string, staffId: string): Promise<StaffSession[]>;
  markExpiredSessions(before: Date): Promise<number>;
}

export interface IDeviceLabelParser {
  parse(userAgent?: string): string | null;
}
