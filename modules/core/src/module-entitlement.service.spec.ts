import { describe, expect, it, vi } from 'vitest';

import { ModuleEntitlementService } from './module-entitlement.service.js';
import type { TenantModulesCache, TenantModulesReader } from './ports/tenant-modules-reader.port.js';

describe('ModuleEntitlementService', () => {
  it('returns enabled modules from reader', async () => {
    const reader: TenantModulesReader = {
      findEnabledModules: vi.fn().mockResolvedValue(['core', 'installments']),
    };

    const service = new ModuleEntitlementService(reader);
    const modules = await service.getEnabledModules('tenant-1');

    expect(modules).toEqual(['core', 'installments']);
  });

  it('reports module as enabled when present', async () => {
    const reader: TenantModulesReader = {
      findEnabledModules: vi.fn().mockResolvedValue(['installments']),
    };

    const service = new ModuleEntitlementService(reader);

    await expect(service.isModuleEnabled('tenant-1', 'installments')).resolves.toBe(true);
    await expect(service.isModuleEnabled('tenant-1', 'inventory')).resolves.toBe(false);
  });

  it('uses cache when available', async () => {
    const reader: TenantModulesReader = {
      findEnabledModules: vi.fn(),
    };
    const cache: TenantModulesCache = {
      get: vi.fn().mockResolvedValue(['installments']),
      set: vi.fn(),
    };

    const service = new ModuleEntitlementService(reader, cache);
    const modules = await service.getEnabledModules('tenant-1');

    expect(modules).toEqual(['installments']);
    expect(reader.findEnabledModules).not.toHaveBeenCalled();
  });

  it('stores modules in cache after reader load', async () => {
    const reader: TenantModulesReader = {
      findEnabledModules: vi.fn().mockResolvedValue(['core']),
    };
    const cache: TenantModulesCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const service = new ModuleEntitlementService(reader, cache);
    await service.getEnabledModules('tenant-1');

    expect(cache.set).toHaveBeenCalledWith('tenant-1', ['core'], 300);
  });
});
