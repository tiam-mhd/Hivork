import { describe, expect, it, vi } from 'vitest';

import { RevokeStaffSessionUseCase } from './revoke-staff-session.use-case.js';

describe('RevokeStaffSessionUseCase', () => {
  it('returns success when session already revoked (idempotent)', async () => {
    const session = {
      id: 'session-1',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      refreshTokenHash: 'hash',
      status: 'revoked',
      deviceLabel: 'Chrome',
      expiresAt: new Date(Date.now() + 60_000),
      revoke: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
    };

    const staffSessions = {
      findByIdForStaff: vi.fn().mockResolvedValue(session),
      saveRevoked: vi.fn(),
    };
    const refreshBlacklist = { revokeByHash: vi.fn(), isRevokedByHash: vi.fn() };
    const tokenBlacklist = { revoke: vi.fn(), isRevoked: vi.fn() };
    const tokens = {
      getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
      verifyRefreshToken: vi.fn().mockResolvedValue(null),
    };
    const audit = { log: vi.fn() };

    const useCase = new RevokeStaffSessionUseCase(
      staffSessions as never,
      refreshBlacklist as never,
      tokenBlacklist as never,
      tokens as never,
      audit as never,
    );

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      actorStaffId: 'staff-1',
      sessionId: 'session-1',
    });

    expect(result).toEqual({ success: true, revokedCurrent: false });
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('throws 404 when session is not owned', async () => {
    const staffSessions = { findByIdForStaff: vi.fn().mockResolvedValue(null) };
    const useCase = new RevokeStaffSessionUseCase(
      staffSessions as never,
      {} as never,
      {} as never,
      { getRefreshTtlSeconds: vi.fn(), verifyRefreshToken: vi.fn() } as never,
      { log: vi.fn() } as never,
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        actorStaffId: 'staff-1',
        sessionId: 'missing',
      }),
    ).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND', httpStatus: 404 });
  });
});
