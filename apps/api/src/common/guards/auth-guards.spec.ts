import { JwtTokenService } from '@hivork/infrastructure';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
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
  } as ExecutionContext;
}

describe('StaffAuthGuard', () => {
  const tokens = new JwtTokenService(jwtConfig);
  const staffRepository = { findContextById: vi.fn() };
  const activeBranchStore = { get: vi.fn() };
  const guard = new StaffAuthGuard(tokens, staffRepository as never, activeBranchStore as never);

  beforeEach(() => {
    vi.clearAllMocks();
    activeBranchStore.get.mockResolvedValue(null);
  });

  it('attaches staff context for a valid staff token', async () => {
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
      dataScope: 'branch',
      assignedBranchIds: ['branch-1'],
      primaryBranchId: 'branch-1',
    });

    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${accessToken}` },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request[STAFF_CONTEXT_KEY]).toMatchObject({
      id: 'staff-1',
      tenantId: 'tenant-1',
      activeBranchId: null,
    });
  });

  it('rejects customer token with WRONG_ACTOR', async () => {
    const accessToken = await tokens.signAccessToken({
      sub: 'customer-1',
      actor: 'customer',
    });
    const request = { headers: { authorization: `Bearer ${accessToken}` } };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      response: { code: 'WRONG_ACTOR' },
    });
  });

  it('rejects active branch outside assignment', async () => {
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
      dataScope: 'branch',
      assignedBranchIds: ['branch-1'],
      primaryBranchId: 'branch-1',
    });

    const request = {
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-branch-id': 'branch-2',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      response: { code: 'BRANCH_NOT_ALLOWED' },
    });
  });

  it('sets activeBranchId from redis session', async () => {
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
      dataScope: 'branch',
      assignedBranchIds: ['branch-1'],
      primaryBranchId: 'branch-1',
    });
    activeBranchStore.get.mockResolvedValue('branch-1');

    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${accessToken}` },
    };

    await guard.canActivate(createContext(request));
    expect(request[STAFF_CONTEXT_KEY]).toMatchObject({ activeBranchId: 'branch-1' });
  });
});

describe('CustomerAuthGuard', () => {
  const tokens = new JwtTokenService(jwtConfig);
  const guard = new CustomerAuthGuard(tokens);

  it('rejects staff token with WRONG_ACTOR', async () => {
    const accessToken = await tokens.signAccessToken({
      sub: 'staff-1',
      actor: 'staff',
      tenantId: 'tenant-1',
    });
    const request = { headers: { authorization: `Bearer ${accessToken}` } };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      response: { code: 'WRONG_ACTOR' },
    });
  });

  it('rejects missing authorization header', async () => {
    await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
