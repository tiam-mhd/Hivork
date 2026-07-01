import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import { assertCanRestore, assertNotDeleted, softDeleteState } from '../rbac/soft-deletable.vo.js';

export type CredentialStatus = 'active' | 'locked' | 'must_change_password';

export type IPasswordHasher = {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
};

export type UserCredentialProps = {
  id: string;
  userId: string;
  passwordHash: string;
  passwordChangedAt: Date | null;
  mustChangePassword: boolean;
  status: CredentialStatus;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: UserCredentialMetadata | null;
};

export type UserCredentialMetadata = {
  passwordHistory?: string[];
};

export class UserCredential {
  constructor(private readonly props: UserCredentialProps) {}

  static create(userId: string, passwordHash: string, options?: { mustChangePassword?: boolean }): UserCredential {
    return new UserCredential({
      id: randomUUID(),
      userId,
      passwordHash,
      passwordChangedAt: new Date(),
      mustChangePassword: options?.mustChangePassword ?? false,
      status: options?.mustChangePassword ? 'must_change_password' : 'active',
      failedLoginCount: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      metadata: null,
    });
  }

  static reconstitute(props: UserCredentialProps): UserCredential {
    return new UserCredential(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get passwordChangedAt(): Date | null {
    return this.props.passwordChangedAt;
  }

  get mustChangePassword(): boolean {
    return this.props.mustChangePassword;
  }

  get status(): CredentialStatus {
    return this.props.status;
  }

  get failedLoginCount(): number {
    return this.props.failedLoginCount;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  get lastFailedLoginAt(): Date | null {
    return this.props.lastFailedLoginAt;
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

  get metadata(): UserCredentialMetadata | null {
    return this.props.metadata;
  }

  get passwordHistory(): string[] {
    return this.props.metadata?.passwordHistory ?? [];
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  async verifyPassword(plain: string, hasher: IPasswordHasher): Promise<boolean> {
    assertNotDeleted(this.props.deletedAt);
    if (this.isLocked(new Date())) {
      throw new DomainError('CREDENTIAL_LOCKED');
    }
    return hasher.verify(plain, this.props.passwordHash);
  }

  markPasswordChanged(hash: string, options?: { passwordHistory?: string[] }): void {
    assertNotDeleted(this.props.deletedAt);
    this.props.passwordHash = hash;
    this.props.passwordChangedAt = new Date();
    this.props.mustChangePassword = false;
    this.props.status = 'active';
    this.props.failedLoginCount = 0;
    this.props.lockedUntil = null;
    this.props.lastFailedLoginAt = null;
    if (options?.passwordHistory !== undefined) {
      this.props.metadata = {
        ...(this.props.metadata ?? {}),
        passwordHistory: options.passwordHistory,
      };
    }
    this.props.version += 1;
  }

  recordFailedLogin(maxAttempts: number, lockoutMinutes: number, now = new Date()): void {
    assertNotDeleted(this.props.deletedAt);
    this.props.failedLoginCount += 1;
    this.props.lastFailedLoginAt = now;

    if (this.props.failedLoginCount >= maxAttempts) {
      this.props.status = 'locked';
      this.props.lockedUntil = new Date(now.getTime() + lockoutMinutes * 60_000);
    }

    this.props.version += 1;
  }

  clearFailedLogins(): void {
    assertNotDeleted(this.props.deletedAt);
    this.props.failedLoginCount = 0;
    this.props.lockedUntil = null;
    this.props.lastFailedLoginAt = null;
    if (this.props.status === 'locked') {
      this.props.status = 'active';
    }
    this.props.version += 1;
  }

  /** Clears expired lock state so the next login attempt can proceed (IFP-013). */
  releaseExpiredLock(now = new Date()): boolean {
    if (this.props.status !== 'locked' || !this.props.lockedUntil) {
      return false;
    }
    if (this.props.lockedUntil > now) {
      return false;
    }
    this.clearFailedLogins();
    return true;
  }

  isLocked(now: Date): boolean {
    if (this.props.status !== 'locked') {
      return false;
    }
    if (!this.props.lockedUntil) {
      return true;
    }
    if (this.props.lockedUntil <= now) {
      return false;
    }
    return true;
  }

  softDelete(actorId: string, reason?: string): void {
    assertNotDeleted(this.props.deletedAt);
    const state = softDeleteState(actorId);
    this.props.deletedAt = state.deletedAt;
    this.props.deletedById = state.deletedById;
    this.props.deleteReason = reason ?? null;
    this.props.version += 1;
  }

  restore(): void {
    assertCanRestore(this.props.deletedAt);
    this.props.deletedAt = null;
    this.props.deletedById = null;
    this.props.deleteReason = null;
    this.props.version += 1;
  }

  toPersistence(): UserCredentialProps {
    return { ...this.props };
  }
}
