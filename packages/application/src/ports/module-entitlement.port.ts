export interface IModuleEntitlement {
  assertModuleEnabled(tenantId: string, moduleCode: string): Promise<void>;
}
