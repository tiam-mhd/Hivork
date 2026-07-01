import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SetInitialPasswordUseCase } from './set-initial-password.use-case.js';

describe('SetInitialPasswordUseCase', () => {
  const validateVerifiedToken = { execute: vi.fn() };
  const userRepository = { findOrCreateByPhone: vi.fn() };
  const credentialRepository = { findByUserId: vi.fn(), create: vi.fn() };
  const passwordHasher = { hash: vi.fn().mockResolvedValue('hashed'), verify: vi.fn() };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };

  const useCase = new SetInitialPasswordUseCase(
    validateVerifiedToken as never,
    userRepository as never,
    credentialRepository as never,
    passwordHasher as never,
    audit as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    validateVerifiedToken.execute.mockResolvedValue({ phone: '09123456789' });
    userRepository.findOrCreateByPhone.mockResolvedValue({ id: 'user-1', phone: '09123456789' });
    credentialRepository.findByUserId.mockResolvedValue(null);
    credentialRepository.create.mockResolvedValue({ id: 'cred-1' });
  });

  it('creates credential for verified register token', async () => {
    await expect(
      useCase.execute({ verifiedToken: 'token', password: 'Secret1pass' }),
    ).resolves.toEqual({ success: true });

    expect(validateVerifiedToken.execute).toHaveBeenCalledWith({
      verifiedToken: 'token',
      consume: false,
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith('Secret1pass');
    expect(credentialRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      passwordHash: 'hashed',
      createdById: 'user-1',
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'security.password.set_initial' }),
    );
  });

  it('rejects when credential already exists', async () => {
    credentialRepository.findByUserId.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({ verifiedToken: 'token', password: 'Secret1pass' }),
    ).rejects.toMatchObject({ code: 'AUTH_CREDENTIAL_ALREADY_EXISTS', httpStatus: 409 });
  });
});
