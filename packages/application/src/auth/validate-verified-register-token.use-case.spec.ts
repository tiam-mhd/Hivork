import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidateVerifiedRegisterTokenUseCase } from './validate-verified-register-token.use-case.js';

describe('ValidateVerifiedRegisterTokenUseCase', () => {
  const tokens = { verifyVerifiedToken: vi.fn() };
  const tokenBlacklist = { isRevoked: vi.fn().mockResolvedValue(false), revoke: vi.fn().mockResolvedValue(undefined) };
  const useCase = new ValidateVerifiedRegisterTokenUseCase(
    tokens as never,
    tokenBlacklist as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tokenBlacklist.isRevoked.mockResolvedValue(false);
  });

  it('accepts a valid register verified token', async () => {
    tokens.verifyVerifiedToken.mockResolvedValue({
      phone: '09123456789',
      actor: 'staff',
      purpose: 'register',
      type: 'verified',
    });

    await expect(
      useCase.execute({
        verifiedToken: 'token',
        ownerPhone: '09123456789',
      }),
    ).resolves.toEqual({ phone: '09123456789' });
  });

  it('rejects expired tokens', async () => {
    tokens.verifyVerifiedToken.mockResolvedValue(null);

    await expect(
      useCase.execute({ verifiedToken: 'expired', ownerPhone: '09123456789' }),
    ).rejects.toMatchObject({ code: 'VERIFIED_TOKEN_EXPIRED', httpStatus: 401 });
  });

  it('rejects phone mismatch', async () => {
    tokens.verifyVerifiedToken.mockResolvedValue({
      phone: '09111111111',
      actor: 'staff',
      purpose: 'register',
      type: 'verified',
    });

    await expect(
      useCase.execute({ verifiedToken: 'token', ownerPhone: '09123456789' }),
    ).rejects.toMatchObject({ code: 'VERIFIED_TOKEN_INVALID', httpStatus: 401 });
  });

  it('does not revoke token when consume is false', async () => {
    tokens.verifyVerifiedToken.mockResolvedValue({
      phone: '09123456789',
      actor: 'staff',
      purpose: 'register',
      type: 'verified',
    });

    await useCase.execute({
      verifiedToken: 'token',
      consume: false,
    });

    expect(tokenBlacklist.revoke).not.toHaveBeenCalled();
  });

  it('rejects already used tokens', async () => {
    tokenBlacklist.isRevoked.mockResolvedValue(true);

    await expect(
      useCase.execute({ verifiedToken: 'used', ownerPhone: '09123456789' }),
    ).rejects.toMatchObject({ code: 'VERIFIED_TOKEN_INVALID', httpStatus: 401 });
  });
});
