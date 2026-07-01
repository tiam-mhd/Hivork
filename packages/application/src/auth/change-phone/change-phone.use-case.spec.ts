import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InitChangePhoneUseCase } from './init-change-phone.use-case.js';
import { RequestNewPhoneOtpUseCase } from './request-new-phone-otp.use-case.js';

describe('InitChangePhoneUseCase', () => {
  const staffRepository = {
    findActiveByIdForTenant: vi.fn(),
  };
  const userRepository = {
    findById: vi.fn(),
    findByPhone: vi.fn(),
    findOrCreateByPhone: vi.fn(),
    updateLastLoginAt: vi.fn(),
    updatePhone: vi.fn(),
    getPhoneConflict: vi.fn(),
    hasActiveStaffMembership: vi.fn(),
    pseudonymizePhone: vi.fn(),
  };
  const credentialRepository = {
    findByUserId: vi.fn(),
  };
  const passwordHasher = {
    hash: vi.fn(),
    verify: vi.fn(),
  };
  const sessionStore = {
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findActiveSessionIdForUser: vi.fn(),
  };
  const audit = {
    log: vi.fn(),
  };

  const useCase = new InitChangePhoneUseCase(
    staffRepository,
    userRepository,
    credentialRepository,
    passwordHasher,
    sessionStore,
    audit,
    1800,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid password', async () => {
    staffRepository.findActiveByIdForTenant.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
    });
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      phone: '09111111111',
      name: null,
      status: 'active',
      lastLoginAt: null,
    });
    credentialRepository.findByUserId.mockResolvedValue({
      verifyPassword: vi.fn().mockResolvedValue(false),
    });

    await expect(
      useCase.execute({
        staffId: 'staff-1',
        tenantId: 'tenant-1',
        actorStaffId: 'staff-1',
        password: 'WrongPass1',
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      httpStatus: 401,
    });
  });

  it('rejects concurrent phone change session', async () => {
    staffRepository.findActiveByIdForTenant.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
    });
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      phone: '09111111111',
      name: null,
      status: 'active',
      lastLoginAt: null,
    });
    credentialRepository.findByUserId.mockResolvedValue({
      verifyPassword: vi.fn().mockResolvedValue(true),
    });
    sessionStore.findActiveSessionIdForUser.mockResolvedValue('existing-session');

    await expect(
      useCase.execute({
        staffId: 'staff-1',
        tenantId: 'tenant-1',
        actorStaffId: 'staff-1',
        password: 'ValidPass1',
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_PHONE_CHANGE_IN_PROGRESS',
      httpStatus: 409,
    });
  });
});

describe('RequestNewPhoneOtpUseCase', () => {
  const staffRepository = {
    findActiveByIdForTenant: vi.fn(),
  };
  const userRepository = {
    findById: vi.fn(),
    findByPhone: vi.fn(),
    findOrCreateByPhone: vi.fn(),
    updateLastLoginAt: vi.fn(),
    updatePhone: vi.fn(),
    getPhoneConflict: vi.fn(),
    hasActiveStaffMembership: vi.fn(),
    pseudonymizePhone: vi.fn(),
  };
  const sessionStore = {
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findActiveSessionIdForUser: vi.fn(),
  };
  const otpStore = {
    save: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  };
  const rateLimiter = {
    checkOtpRateLimit: vi.fn().mockResolvedValue(true),
  };
  const sms = {
    send: vi.fn(),
  };

  const useCase = new RequestNewPhoneOtpUseCase(
    staffRepository,
    userRepository,
    sessionStore,
    otpStore,
    rateLimiter,
    sms,
    120,
    1800,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    staffRepository.findActiveByIdForTenant.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
    });
    sessionStore.get.mockResolvedValue({
      userId: 'user-1',
      staffId: 'staff-1',
      tenantId: 'tenant-1',
      currentPhone: '09111111111',
      step: 'current_verified',
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  it('returns 409 when new phone belongs to another staff user', async () => {
    userRepository.getPhoneConflict.mockResolvedValue('staff_user');

    await expect(
      useCase.execute({
        staffId: 'staff-1',
        tenantId: 'tenant-1',
        actorStaffId: 'staff-1',
        changeSessionId: 'session-1',
        newPhone: '09122222222',
      }),
    ).rejects.toMatchObject({
      code: 'PHONE_ALREADY_IN_USE',
      httpStatus: 409,
    });
  });

  it('returns 401 when session expired', async () => {
    sessionStore.get.mockResolvedValue(null);

    await expect(
      useCase.execute({
        staffId: 'staff-1',
        tenantId: 'tenant-1',
        actorStaffId: 'staff-1',
        changeSessionId: 'session-1',
        newPhone: '09122222222',
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_PHONE_CHANGE_EXPIRED',
      httpStatus: 401,
    });
  });
});
