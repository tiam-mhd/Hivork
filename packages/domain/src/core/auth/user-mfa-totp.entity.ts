import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import { assertCanRestore, assertNotDeleted, softDeleteState } from '../rbac/soft-deletable.vo.js';

export type BackupCodeEntry = {
  hash: string;
  usedAt: string | null;
};

export type UserMfaTotpProps = {
  id: string;
  userId: string;
  secretEncrypted: string;
  enabledAt: Date | null;
  lastUsedAt: Date | null;
  backupCodesHash: BackupCodeEntry[] | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
};

const TOTP_STEP_MS = 30_000;

export class UserMfaTotp {
  constructor(private readonly props: UserMfaTotpProps) {}

  static create(userId: string, secretEncrypted: string, actorId?: string): UserMfaTotp {
    return new UserMfaTotp({
      id: randomUUID(),
      userId,
      secretEncrypted,
      enabledAt: null,
      lastUsedAt: null,
      backupCodesHash: null,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      ...(actorId ? {} : {}),
    });
  }

  static reconstitute(props: UserMfaTotpProps): UserMfaTotp {
    return new UserMfaTotp(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get secretEncrypted(): string {
    return this.props.secretEncrypted;
  }

  get enabledAt(): Date | null {
    return this.props.enabledAt;
  }

  get lastUsedAt(): Date | null {
    return this.props.lastUsedAt;
  }

  get backupCodesHash(): BackupCodeEntry[] | null {
    return this.props.backupCodesHash;
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

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  isEnabled(): boolean {
    return !this.isDeleted && this.props.enabledAt !== null;
  }

  isReplayInCurrentWindow(now = new Date()): boolean {
    if (!this.props.lastUsedAt) {
      return false;
    }

    const currentWindow = Math.floor(now.getTime() / TOTP_STEP_MS);
    const lastWindow = Math.floor(this.props.lastUsedAt.getTime() / TOTP_STEP_MS);
    return currentWindow === lastWindow;
  }

  prepareForSetup(secretEncrypted: string): void {
    assertNotDeleted(this.props.deletedAt);
    this.props.secretEncrypted = secretEncrypted;
    this.props.enabledAt = null;
    this.props.lastUsedAt = null;
    this.props.backupCodesHash = null;
    this.props.version += 1;
  }

  enable(backupCodesHash: BackupCodeEntry[], now = new Date()): void {
    assertNotDeleted(this.props.deletedAt);
    this.props.enabledAt = now;
    this.props.lastUsedAt = null;
    this.props.backupCodesHash = backupCodesHash;
    this.props.version += 1;
  }

  markTotpUsed(now = new Date()): void {
    assertNotDeleted(this.props.deletedAt);
    if (!this.isEnabled()) {
      throw new DomainError('MFA_TOTP_NOT_ENABLED');
    }
    this.props.lastUsedAt = now;
    this.props.version += 1;
  }

  setBackupCodes(backupCodesHash: BackupCodeEntry[]): void {
    assertNotDeleted(this.props.deletedAt);
    if (!this.isEnabled()) {
      throw new DomainError('MFA_TOTP_NOT_ENABLED');
    }
    this.props.backupCodesHash = backupCodesHash;
    this.props.version += 1;
  }

  markBackupCodeUsed(index: number, now = new Date()): void {
    assertNotDeleted(this.props.deletedAt);
    const entries = this.props.backupCodesHash;
    if (!entries || index < 0 || index >= entries.length) {
      throw new DomainError('BACKUP_CODE_INVALID');
    }

    const entry = entries[index];
    if (!entry || entry.usedAt !== null) {
      throw new DomainError('BACKUP_CODE_USED');
    }

    entries[index] = { ...entry, usedAt: now.toISOString() };
    this.props.version += 1;
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

  toPersistence(): UserMfaTotpProps {
    return { ...this.props };
  }
}

export function normalizeBackupCodeInput(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function isBackupCodeFormat(code: string): boolean {
  const normalized = normalizeBackupCodeInput(code);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized);
}

export function isTotpCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
