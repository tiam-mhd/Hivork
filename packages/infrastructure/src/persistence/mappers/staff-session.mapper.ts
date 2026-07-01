import { StaffSession, type StaffSessionProps } from '@hivork/domain';
import type { SessionStatus } from '@prisma/client';

export function staffSessionToDomain(row: {
  id: string;
  tenantId: string;
  staffId: string;
  userId: string;
  refreshTokenHash: string;
  deviceId: string | null;
  deviceFingerprint: string | null;
  deviceLabel: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  status: SessionStatus;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
  revokeReason: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
}): StaffSession {
  const props: StaffSessionProps = {
    id: row.id,
    tenantId: row.tenantId,
    staffId: row.staffId,
    userId: row.userId,
    refreshTokenHash: row.refreshTokenHash,
    deviceId: row.deviceId,
    deviceFingerprint: row.deviceFingerprint,
    deviceLabel: row.deviceLabel,
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    rememberMe: row.rememberMe,
    status: row.status,
    lastActiveAt: row.lastActiveAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    revokedById: row.revokedById,
    revokeReason: row.revokeReason,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
  };
  return StaffSession.reconstitute(props);
}

export function staffSessionToCreateData(session: StaffSession, createdById?: string) {
  return {
    id: session.id,
    tenantId: session.tenantId,
    staffId: session.staffId,
    userId: session.userId,
    refreshTokenHash: session.refreshTokenHash,
    deviceId: session.deviceId,
    deviceFingerprint: session.deviceFingerprint,
    deviceLabel: session.deviceLabel,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    rememberMe: session.rememberMe,
    status: session.status,
    lastActiveAt: session.lastActiveAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    revokedById: session.revokedById,
    revokeReason: session.revokeReason,
    createdById: createdById ?? null,
    version: session.version,
  };
}

export function staffSessionToUpdateData(session: StaffSession, updatedById?: string) {
  return {
    status: session.status,
    lastActiveAt: session.lastActiveAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    revokedById: session.revokedById,
    revokeReason: session.revokeReason,
    updatedById: updatedById ?? null,
    version: session.version,
  };
}
