import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidateMfaPendingTokenUseCase } from './validate-mfa-pending-token.use-case.js';

describe('ValidateMfaPendingTokenUseCase', () => {
  const tokens = {
    verifyMfaPendingToken: vi.fn(),
    getMfaPendingTtlSeconds: vi.fn().mockReturnValue(300),
  };
  const tokenBlacklist = {
    isRevoked: vi.fn().mockResolvedValue(false),
    revoke: vi.fn().mockResolvedValue(undefined),
  };

  const useCase = new ValidateMfaPendingTokenUseCase(tokens as never, tokenBlacklist as never);

  beforeEach(() => {
    vi.clearAllMocks();
    tokens.verifyMfaPendingToken.mockResolvedValue({
      sub: 'user-1',
      actor: 'staff',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      type: 'mfa_pending',
    });
  });

  it('returns payload when token is valid', async () => {
    const payload = await useCase.execute({ mfaToken: 'token', consume: false });
    expect(payload.staffId).toBe('staff-1');
    expect(tokenBlacklist.revoke).not.toHaveBeenCalled();
  });

  it('revokes token when consume is true', async () => {
    await useCase.execute({ mfaToken: 'token', consume: true });
    expect(tokenBlacklist.revoke).toHaveBeenCalledWith('token', 300);
  });

  it('rejects revoked token', async () => {
    tokenBlacklist.isRevoked.mockResolvedValue(true);
    await expect(useCase.execute({ mfaToken: 'token' })).rejects.toMatchObject({
      code: 'AUTH_MFA_TOKEN_INVALID',
      httpStatus: 401,
    });
  });
});
