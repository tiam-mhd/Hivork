import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

export type SessionStatus = 'active' | 'revoked' | 'expired';

export type StaffSessionProps = {
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
};

export type CreateStaffSessionParams = {
  tenantId: string;
  staffId: string;
  userId: string;
  refreshTokenHash: string;
  rememberMe: boolean;
  expiresAt: Date;
  deviceId?: string;
  deviceFingerprint?: string;
  deviceLabel?: string;
  userAgent?: string;
  ipAddress?: string;
  createdById?: string;
};

export class StaffSession {
  constructor(private readonly props: StaffSessionProps) {}

  static create(params: CreateStaffSessionParams): StaffSession {
    if (!params.refreshTokenHash || params.refreshTokenHash.length !== 64) {
      throw new DomainError('INVALID_REFRESH_TOKEN_HASH');
    }

    const now = new Date();
    return new StaffSession({
      id: randomUUID(),
      tenantId: params.tenantId,
      staffId: params.staffId,
      userId: params.userId,
      refreshTokenHash: params.refreshTokenHash,
      deviceId: params.deviceId ?? null,
      deviceFingerprint: params.deviceFingerprint ?? null,
      deviceLabel: params.deviceLabel ?? null,
      userAgent: params.userAgent ?? null,
      ipAddress: params.ipAddress ?? null,
      rememberMe: params.rememberMe,
      status: 'active',
      lastActiveAt: now,
      expiresAt: params.expiresAt,
      revokedAt: null,
      revokedById: null,
      revokeReason: null,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
    });
  }

  static reconstitute(props: StaffSessionProps): StaffSession {
    return new StaffSession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get staffId(): string {
    return this.props.staffId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }

  get deviceId(): string | null {
    return this.props.deviceId;
  }

  get deviceFingerprint(): string | null {
    return this.props.deviceFingerprint;
  }

  get deviceLabel(): string | null {
    return this.props.deviceLabel;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get rememberMe(): boolean {
    return this.props.rememberMe;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  get lastActiveAt(): Date {
    return this.props.lastActiveAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get revokedById(): string | null {
    return this.props.revokedById;
  }

  get revokeReason(): string | null {
    return this.props.revokeReason;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get deletedById(): string | null {
    return this.props.deletedById;
  }

  get deleteReason(): string | null {
    return this.props.deleteReason;
  }

  get version(): number {
    return this.props.version;
  }

  isActive(now: Date = new Date()): boolean {
    return (
      this.props.status === 'active' &&
      this.props.revokedAt === null &&
      this.props.deletedAt === null &&
      this.props.expiresAt > now
    );
  }

  touch(now: Date = new Date(), nextExpiresAt?: Date): void {
    if (!this.isActive(now)) {
      throw new DomainError('STAFF_SESSION_NOT_ACTIVE');
    }
    this.props.lastActiveAt = now;
    if (nextExpiresAt) {
      this.props.expiresAt = nextExpiresAt;
    }
    this.props.version += 1;
  }

  rotateRefresh(refreshTokenHash: string, now: Date, expiresAt: Date): void {
    if (!this.isActive(now)) {
      throw new DomainError('STAFF_SESSION_NOT_ACTIVE');
    }
    if (!refreshTokenHash || refreshTokenHash.length !== 64) {
      throw new DomainError('INVALID_REFRESH_TOKEN_HASH');
    }
    this.props.refreshTokenHash = refreshTokenHash;
    this.props.lastActiveAt = now;
    this.props.expiresAt = expiresAt;
    this.props.version += 1;
  }

  revoke(actorId: string, reason: string, now: Date = new Date()): void {
    if (this.props.status !== 'active') {
      return;
    }
    this.props.status = 'revoked';
    this.props.revokedAt = now;
    this.props.revokedById = actorId;
    this.props.revokeReason = reason;
    this.props.version += 1;
  }

  markExpired(_now: Date = new Date()): void {
    if (this.props.status !== 'active') {
      return;
    }
    this.props.status = 'expired';
    this.props.version += 1;
  }

  toProps(): StaffSessionProps {
    return { ...this.props };
  }
}
