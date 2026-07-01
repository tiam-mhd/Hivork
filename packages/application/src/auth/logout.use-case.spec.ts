import { describe, expect, it, vi } from 'vitest';

import { LogoutUseCase } from './logout.use-case.js';

describe('LogoutUseCase', () => {
  it('blacklists refresh token on logout', async () => {
    const tokens = {
      getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
      verifyRefreshToken: vi.fn().mockResolvedValue(null),
    };
    const tokenBlacklist = { revoke: vi.fn().mockResolvedValue(undefined), isRevoked: vi.fn() };
    const staffSessionRepository = {
      findByRefreshTokenHash: vi.fn(),
    };
    const refreshBlacklist = { revokeByHash: vi.fn(), isRevokedByHash: vi.fn() };
    const audit = { log: vi.fn() };
    const useCase = new LogoutUseCase(
      tokens as never,
      tokenBlacklist,
      staffSessionRepository as never,
      refreshBlacklist as never,
      audit as never,
    );

    const result = await useCase.execute({
      actor: 'staff',
      refreshToken: 'refresh-token',
    });

    expect(result).toEqual({ success: true });
    expect(tokenBlacklist.revoke).toHaveBeenCalledWith('refresh-token', 2_592_000);
  });

  it('revokes matching staff session on logout', async () => {
    const session = {
      id: 'session-1',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      refreshTokenHash: 'abc',
      status: 'active',
      expiresAt: new Date(Date.now() + 60_000),
      revoke: vi.fn(),
      isActive: vi.fn().mockReturnValue(true),
    };
    const tokens = {
      getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
      verifyRefreshToken: vi.fn().mockResolvedValue({ jti: 'jti-1', actor: 'staff' }),
    };
    const tokenBlacklist = { revoke: vi.fn().mockResolvedValue(undefined), isRevoked: vi.fn() };
    const staffSessionRepository = {
      findByRefreshTokenHash: vi.fn().mockResolvedValue(session),
      saveRevoked: vi.fn().mockResolvedValue(undefined),
    };
    const refreshBlacklist = {
      revokeByHash: vi.fn().mockResolvedValue(undefined),
      isRevokedByHash: vi.fn(),
    };
    const audit = { log: vi.fn().mockResolvedValue(undefined) };
    const useCase = new LogoutUseCase(
      tokens as never,
      tokenBlacklist,
      staffSessionRepository as never,
      refreshBlacklist as never,
      audit as never,
    );

    await useCase.execute({
      actor: 'staff',
      refreshToken: 'refresh-token',
    });

    expect(staffSessionRepository.saveRevoked).toHaveBeenCalled();
    expect(refreshBlacklist.revokeByHash).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'security.session.revoked' }),
    );
  });

  it('succeeds without a refresh token', async () => {
    const tokens = { getRefreshTtlSeconds: vi.fn(), verifyRefreshToken: vi.fn() };
    const tokenBlacklist = { revoke: vi.fn(), isRevoked: vi.fn() };
    const staffSessionRepository = { findByRefreshTokenHash: vi.fn() };
    const refreshBlacklist = { revokeByHash: vi.fn(), isRevokedByHash: vi.fn() };
    const audit = { log: vi.fn() };
    const useCase = new LogoutUseCase(
      tokens as never,
      tokenBlacklist,
      staffSessionRepository as never,
      refreshBlacklist as never,
      audit as never,
    );

    await expect(useCase.execute({ actor: 'customer' })).resolves.toEqual({ success: true });
    expect(tokenBlacklist.revoke).not.toHaveBeenCalled();
  });
});
