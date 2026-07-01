import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StaffSession } from '@hivork/domain';

import { hashRefreshTokenJti } from './refresh-token-hash.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';

describe('RefreshSessionUseCase', () => {
  const tokens = {
    verifyRefreshToken: vi.fn(),
    signAccessToken: vi.fn().mockResolvedValue('new-access-token'),
    signRefreshToken: vi.fn().mockResolvedValue({ token: 'new-refresh-token', jti: 'new-jti' }),
    getAccessTtlSeconds: vi.fn().mockReturnValue(900),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
    getRefreshSessionTtlSeconds: vi.fn().mockReturnValue(86_400),
  };
  const staffRepository = { findById: vi.fn() };
  const customerRepository = { findById: vi.fn() };
  const tokenBlacklist = {
    isRevoked: vi.fn().mockResolvedValue(false),
    revoke: vi.fn(),
  };
  const refreshInvalidation = {
    getInvalidBefore: vi.fn().mockResolvedValue(null),
    invalidateAllForUser: vi.fn(),
  };
  const staffSessionRepository = {
    findActiveByRefreshTokenHash: vi.fn().mockResolvedValue(null),
    rotateActiveSessionRefreshHash: vi.fn().mockResolvedValue(true),
    findAllActiveForStaff: vi.fn().mockResolvedValue([]),
    saveRevoked: vi.fn(),
  };
  const refreshBlacklist = {
    isRevokedByHash: vi.fn().mockResolvedValue(false),
    revokeByHash: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const useCase = new RefreshSessionUseCase(
    tokens as never,
    staffRepository as never,
    customerRepository as never,
    tokenBlacklist,
    refreshInvalidation as never,
    staffSessionRepository as never,
    refreshBlacklist as never,
    audit as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tokenBlacklist.isRevoked.mockResolvedValue(false);
    refreshBlacklist.isRevokedByHash.mockResolvedValue(false);
  });

  it('rotates refresh token and issues new access token for staff', async () => {
    staffSessionRepository.findActiveByRefreshTokenHash.mockResolvedValue({
      rememberMe: false,
    });
    tokens.verifyRefreshToken.mockResolvedValue({
      sub: 'staff-1',
      actor: 'staff',
      type: 'refresh',
      jti: 'refresh-jti',
      rememberMe: false,
    });
    staffRepository.findById.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      phone: '09123456789',
      name: 'Owner',
      status: 'active',
      tenantSlug: 'demo-shop',
      tenantName: 'Demo',
      tenantStatus: 'active',
    });

    const result = await useCase.execute({
      actor: 'staff',
      refreshToken: 'refresh-token',
    });

    expect(result).toEqual({
      accessToken: 'new-access-token',
      expiresIn: 900,
      refreshToken: 'new-refresh-token',
      rememberMe: false,
    });
    expect(tokens.signRefreshToken).toHaveBeenCalledWith(
      { sub: 'staff-1', actor: 'staff'  },
      { rememberMe: false },
    );
    expect(staffSessionRepository.rotateActiveSessionRefreshHash).toHaveBeenCalled();
    expect(refreshBlacklist.revokeByHash).toHaveBeenCalled();
    expect(tokenBlacklist.revoke).toHaveBeenCalledWith('refresh-token', 86_400);
  });

  it('rejects revoked refresh tokens', async () => {
    tokenBlacklist.isRevoked.mockResolvedValue(true);

    await expect(
      useCase.execute({ actor: 'staff', refreshToken: 'revoked-token' }),
    ).rejects.toMatchObject({ code: 'AUTH_REFRESH_EXPIRED', httpStatus: 401 });
  });

  it('rejects expired refresh tokens', async () => {
    tokens.verifyRefreshToken.mockResolvedValue(null);

    await expect(
      useCase.execute({ actor: 'customer', refreshToken: 'bad-token' }),
    ).rejects.toMatchObject({ code: 'AUTH_REFRESH_EXPIRED', httpStatus: 401 });
  });

  it('revokes all sessions and audits when refresh token reuse is detected', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({
      sub: 'staff-1',
      actor: 'staff',
      type: 'refresh',
      jti: 'reused-jti',
    });
    refreshBlacklist.isRevokedByHash.mockResolvedValue(true);
    staffRepository.findById.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      status: 'active',
      tenantStatus: 'active',
    });
    const reusedHash = hashRefreshTokenJti('reused-jti');
    staffSessionRepository.findAllActiveForStaff.mockResolvedValue([
      StaffSession.create({
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        userId: 'user-1',
        refreshTokenHash: reusedHash,
        rememberMe: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ]);

    await expect(
      useCase.execute({
        actor: 'staff',
        refreshToken: 'reused-token',
        clientIp: '1.2.3.4',
        userAgent: 'test-agent',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_REFRESH_COMPROMISED', httpStatus: 401 });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'security.token.reuse_detected',
        actorId: 'staff-1',
        tenantId: 'tenant-1',
      }),
    );
  });
});
