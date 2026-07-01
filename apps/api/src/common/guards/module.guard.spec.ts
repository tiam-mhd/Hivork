import {
  ModuleEntitlementService,
  ModuleGuard,
  ModuleRegistryService,
} from '@hivork/module-core';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { StaffTenantIdResolver } from '../resolvers/staff-tenant-id.resolver.js';

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

describe('ModuleGuard (API wiring)', () => {
  const reflector = new Reflector();
  const moduleRegistry = {
    get: vi.fn().mockReturnValue({ code: 'installments' }),
    onModuleInit: vi.fn(),
    register: vi.fn(),
    getAllPermissions: vi.fn(),
    bootstrap: vi.fn(),
  } as unknown as ModuleRegistryService;
  const reader = {
    findEnabledModules: vi.fn(),
  };
  const cache = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  };
  const entitlement = new ModuleEntitlementService(reader, cache);
  const tenantIdResolver = new StaffTenantIdResolver();
  const guard = new ModuleGuard(reflector, moduleRegistry, entitlement, tenantIdResolver);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('installments');
    vi.mocked(moduleRegistry.get).mockReturnValue({ code: 'installments' } as never);
  });

  it('denies tenant without installments in enabledModules', async () => {
    reader.findEnabledModules.mockResolvedValue(['core']);

    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: null,
        activeBranchId: null,
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      response: { code: 'MODULE_NOT_ENABLED' },
    });
  });

  it('allows tenant with installments enabled', async () => {
    reader.findEnabledModules.mockResolvedValue(['core', 'installments']);

    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: null,
        activeBranchId: null,
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });
});

describe('StaffTenantIdResolver', () => {
  it('reads tenantId from staff context', () => {
    const resolver = new StaffTenantIdResolver();
    const tenantId = resolver.resolveTenantId(
      createContext({
        [STAFF_CONTEXT_KEY]: {
          id: 'staff-1',
          tenantId: 'tenant-abc',
          dataScope: 'all',
          assignedBranchIds: [],
          primaryBranchId: null,
          activeBranchId: null,
        },
      }),
    );

    expect(tenantId).toBe('tenant-abc');
  });
});
