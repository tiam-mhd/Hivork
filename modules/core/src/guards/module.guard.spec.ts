import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ModuleEntitlementService } from '../module-entitlement.service.js';
import { ModuleRegistryService } from '../module-registry.service.js';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator.js';
import { ModuleGuard } from './module.guard.js';
import type { TenantIdResolver } from '../ports/tenant-id-resolver.port.js';

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

describe('ModuleGuard', () => {
  const reflector = new Reflector();
  const moduleRegistry = {
    get: vi.fn(),
  } as unknown as ModuleRegistryService;
  const moduleEntitlement = {
    isModuleEnabled: vi.fn(),
  } as unknown as ModuleEntitlementService;
  const tenantIdResolver: TenantIdResolver = {
    resolveTenantId: vi.fn(),
  };

  const guard = new ModuleGuard(reflector, moduleRegistry, moduleEntitlement, tenantIdResolver);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('installments');
    (moduleRegistry.get as ReturnType<typeof vi.fn>).mockReturnValue({ code: 'installments' });
    (tenantIdResolver.resolveTenantId as ReturnType<typeof vi.fn>).mockReturnValue('tenant-1');
  });

  it('allows when module is enabled for tenant', async () => {
    (moduleEntitlement.isModuleEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(moduleEntitlement.isModuleEnabled).toHaveBeenCalledWith('tenant-1', 'installments');
  });

  it('returns 403 MODULE_NOT_ENABLED when tenant lacks module', async () => {
    (moduleEntitlement.isModuleEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(guard.canActivate(createContext({}))).rejects.toMatchObject({
      response: { code: 'MODULE_NOT_ENABLED' },
    });
  });

  it('returns 401 when tenant context is missing', async () => {
    (tenantIdResolver.resolveTenantId as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(guard.canActivate(createContext({}))).rejects.toMatchObject({
      response: { code: 'UNAUTHORIZED' },
    });
  });

  it('skips check when module metadata is absent', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(moduleEntitlement.isModuleEnabled).not.toHaveBeenCalled();
  });

  it('returns 403 when module is not registered', async () => {
    (moduleRegistry.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await expect(guard.canActivate(createContext({}))).rejects.toMatchObject({
      response: { code: 'MODULE_NOT_ENABLED' },
    });
  });

  it('reads module metadata from handler and class', async () => {
    const getAllAndOverride = vi.spyOn(reflector, 'getAllAndOverride');
    const context = createContext({});
    (moduleEntitlement.isModuleEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await guard.canActivate(context);
    expect(getAllAndOverride).toHaveBeenCalledWith(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
