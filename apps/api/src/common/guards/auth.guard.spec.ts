import { JwtTokenService } from '@hivork/infrastructure';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ACTOR_METADATA_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { AuthGuard } from './auth.guard.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { StaffAuthGuard } from './staff-auth.guard.js';

const jwtConfig = {
  accessSecret: 'access-secret-at-least-32-characters-long',
  refreshSecret: 'refresh-secret-at-least-32-characters-long',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 2_592_000,
  verifiedTtlSeconds: 300,
};

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  const tokens = new JwtTokenService(jwtConfig);
  const staffRepository = { findContextById: vi.fn() };
  const activeBranchStore = { get: vi.fn() };
  const staffAuthGuard = new StaffAuthGuard(
    tokens,
    staffRepository as never,
    activeBranchStore as never,
  );
  const customerAuthGuard = new CustomerAuthGuard(tokens);
  const reflector = new Reflector();

  const guard = new AuthGuard(reflector, staffAuthGuard, customerAuthGuard);

  beforeEach(() => {
    vi.clearAllMocks();
    activeBranchStore.get.mockResolvedValue(null);
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('staff');
  });

  it('rejects missing Authorization header with 401 UNAUTHORIZED', async () => {
    await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toMatchObject({
      response: { code: 'UNAUTHORIZED' },
    });
  });

  it('rejects expired token with 401 TOKEN_EXPIRED', async () => {
    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer not-a-valid-token' } }),
      ),
    ).rejects.toMatchObject({
      response: { code: 'TOKEN_EXPIRED' },
    });
  });

  it('delegates to staff guard when actor metadata is staff', async () => {
    const accessToken = await tokens.signAccessToken({
      sub: 'staff-1',
      actor: 'staff',
      tenantId: 'tenant-1',
    });
    staffRepository.findContextById.mockResolvedValue({
      id: 'staff-1',
      tenantId: 'tenant-1',
      phone: '09123456789',
      name: 'Owner',
      status: 'active',
      dataScope: 'all',
      assignedBranchIds: [],
      primaryBranchId: null,
    });

    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${accessToken}` },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request[STAFF_CONTEXT_KEY]).toMatchObject({ id: 'staff-1', tenantId: 'tenant-1' });
  });

  it('delegates to customer guard when actor metadata is customer', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('customer');

    const accessToken = await tokens.signAccessToken({
      sub: 'customer-1',
      actor: 'customer',
    });

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: `Bearer ${accessToken}` } }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects wrong actor with 403 WRONG_ACTOR', async () => {
    const accessToken = await tokens.signAccessToken({
      sub: 'customer-1',
      actor: 'customer',
    });

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: `Bearer ${accessToken}` } }),
      ),
    ).rejects.toMatchObject({
      response: { code: 'WRONG_ACTOR' },
    });
  });

  it('rejects when actor metadata is missing', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer token' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reads actor metadata from handler and class', async () => {
    const getAllAndOverride = vi.spyOn(reflector, 'getAllAndOverride');
    const context = createContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(getAllAndOverride).toHaveBeenCalledWith(ACTOR_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
