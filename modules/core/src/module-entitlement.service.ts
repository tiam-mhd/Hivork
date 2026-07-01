import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  TENANT_MODULES_CACHE,
  TENANT_MODULES_READER,
  type TenantModulesCache,
  type TenantModulesReader,
} from './ports/tenant-modules-reader.port.js';

const DEFAULT_CACHE_TTL_SECONDS = 300;

@Injectable()
export class ModuleEntitlementService {
  private readonly cacheTtlSeconds = DEFAULT_CACHE_TTL_SECONDS;

  constructor(
    @Inject(TENANT_MODULES_READER) private readonly reader: TenantModulesReader,
    @Optional() @Inject(TENANT_MODULES_CACHE) private readonly cache: TenantModulesCache | null = null,
  ) {}

  async getEnabledModules(tenantId: string): Promise<string[]> {
    if (this.cache) {
      const cached = await this.cache.get(tenantId);
      if (cached) {
        return cached;
      }
    }

    const modules = await this.reader.findEnabledModules(tenantId);

    if (this.cache) {
      await this.cache.set(tenantId, modules, this.cacheTtlSeconds);
    }

    return modules;
  }

  async isModuleEnabled(tenantId: string, moduleCode: string): Promise<boolean> {
    const modules = await this.getEnabledModules(tenantId);
    return modules.includes(moduleCode);
  }
}
