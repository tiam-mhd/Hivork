import { GetStaffPermissionsUseCase } from '@hivork/application';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PERMISSION_METADATA_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { PermissionGuard } from './permission.guard.js';

const PERMISSION_CREATE = 'installments.customer.create';
const PERMISSION_VIEW = 'installments.customer.view';

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

describe('PermissionGuard', () => {
  const reflector = new Reflector();
  const repository = { findPermissionSourcesByStaffId: vi.fn() };
  const getStaffPermissions = new GetStaffPermissionsUseCase(repository);
  const guard = new PermissionGuard(reflector, getStaffPermissions);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(PERMISSION_CREATE);
  });

  it('allows owner staff with required permission', async () => {
    repository.findPermissionSourcesByStaffId.mockResolvedValue({
      rolePermissions: [PERMISSION_CREATE, PERMISSION_VIEW],
      grants: [],
      denies: [],
    });

    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'owner-staff',
        tenantId: 'tenant-1',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: null,
        activeBranchId: null,
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('denies viewer staff on create permission', async () => {
    repository.findPermissionSourcesByStaffId.mockResolvedValue({
      rolePermissions: [PERMISSION_VIEW],
      grants: [],
      denies: [],
    });

    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'viewer-staff',
        tenantId: 'tenant-1',
        dataScope: 'branch',
        assignedBranchIds: ['branch-1'],
        primaryBranchId: 'branch-1',
        activeBranchId: null,
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      response: { code: 'PERMISSION_DENIED' },
    });
  });

  it('denies when user DENY override blocks role GRANT', async () => {
    repository.findPermissionSourcesByStaffId.mockResolvedValue({
      rolePermissions: [PERMISSION_CREATE],
      grants: [],
      denies: [PERMISSION_CREATE],
    });

    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-with-deny',
        tenantId: 'tenant-1',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: null,
        activeBranchId: null,
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when staff context is missing', async () => {
    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('skips check when permission metadata is absent', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(repository.findPermissionSourcesByStaffId).not.toHaveBeenCalled();
  });

  it('reads permission metadata from handler and class', async () => {
    const getAllAndOverride = vi.spyOn(reflector, 'getAllAndOverride');
    const context = createContext({
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: null,
        activeBranchId: null,
      },
    });
    repository.findPermissionSourcesByStaffId.mockResolvedValue({
      rolePermissions: [PERMISSION_CREATE],
      grants: [],
      denies: [],
    });

    await guard.canActivate(context);
    expect(getAllAndOverride).toHaveBeenCalledWith(PERMISSION_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
