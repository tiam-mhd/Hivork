export const TENANT_MODULES_READER = Symbol('TENANT_MODULES_READER');

export interface TenantModulesReader {
  findEnabledModules(tenantId: string): Promise<string[]>;
}

export const TENANT_MODULES_CACHE = Symbol('TENANT_MODULES_CACHE');

export interface TenantModulesCache {
  get(tenantId: string): Promise<string[] | null>;
  set(tenantId: string, modules: string[], ttlSeconds: number): Promise<void>;
}
