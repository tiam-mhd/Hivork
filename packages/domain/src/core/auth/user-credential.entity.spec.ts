import { describe, expect, it, vi } from 'vitest';

import { UserCredential, type IPasswordHasher } from './user-credential.entity.js';

function createHasher(match = true): IPasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue('hashed'),
    verify: vi.fn().mockResolvedValue(match),
  };
}

describe('UserCredential', () => {
  it('creates with active status by default', () => {
    const credential = UserCredential.create('user-1', 'hash');
    expect(credential.status).toBe('active');
    expect(credential.mustChangePassword).toBe(false);
    expect(credential.failedLoginCount).toBe(0);
  });

  it('creates with must_change_password when flagged', () => {
    const credential = UserCredential.create('user-1', 'hash', { mustChangePassword: true });
    expect(credential.status).toBe('must_change_password');
    expect(credential.mustChangePassword).toBe(true);
  });

  it('locks after max failed login attempts', () => {
    const credential = UserCredential.create('user-1', 'hash');
    const now = new Date('2026-06-30T12:00:00.000Z');

    credential.recordFailedLogin(3, 15, now);
    credential.recordFailedLogin(3, 15, now);
    expect(credential.isLocked(now)).toBe(false);

    credential.recordFailedLogin(3, 15, now);
    expect(credential.status).toBe('locked');
    expect(credential.isLocked(now)).toBe(true);
    expect(credential.lockedUntil?.getTime()).toBe(now.getTime() + 15 * 60_000);
  });

  it('clears failed logins on success path', () => {
    const credential = UserCredential.create('user-1', 'hash');
    credential.recordFailedLogin(5, 15);
    credential.clearFailedLogins();
    expect(credential.failedLoginCount).toBe(0);
    expect(credential.status).toBe('active');
  });

  it('releases expired lock automatically', () => {
    const lockedAt = new Date('2026-06-30T12:00:00.000Z');
    const credential = UserCredential.reconstitute({
      id: 'cred-1',
      userId: 'user-1',
      passwordHash: 'hash',
      passwordChangedAt: lockedAt,
      mustChangePassword: false,
      status: 'locked',
      failedLoginCount: 5,
      lockedUntil: new Date(lockedAt.getTime() + 30 * 60_000),
      lastFailedLoginAt: lockedAt,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      metadata: null,
    });

    expect(credential.isLocked(lockedAt)).toBe(true);
    const afterExpiry = new Date(lockedAt.getTime() + 31 * 60_000);
    expect(credential.isLocked(afterExpiry)).toBe(false);
    expect(credential.releaseExpiredLock(afterExpiry)).toBe(true);
    expect(credential.status).toBe('active');
    expect(credential.failedLoginCount).toBe(0);
  });

  it('markPasswordChanged resets lockout state', () => {
    const credential = UserCredential.create('user-1', 'old', { mustChangePassword: true });
    credential.recordFailedLogin(1, 15);
    credential.markPasswordChanged('new-hash');

    expect(credential.passwordHash).toBe('new-hash');
    expect(credential.mustChangePassword).toBe(false);
    expect(credential.status).toBe('active');
    expect(credential.failedLoginCount).toBe(0);
  });

  it('verifyPassword delegates to hasher', async () => {
    const hasher = createHasher(true);
    const credential = UserCredential.create('user-1', 'hash');
    await expect(credential.verifyPassword('secret', hasher)).resolves.toBe(true);
    expect(hasher.verify).toHaveBeenCalledWith('secret', 'hash');
  });

  it('softDelete and restore', () => {
    const credential = UserCredential.create('user-1', 'hash');
    credential.softDelete('admin-1', 'test');
    expect(credential.isDeleted).toBe(true);
    credential.restore();
    expect(credential.isDeleted).toBe(false);
  });
});
