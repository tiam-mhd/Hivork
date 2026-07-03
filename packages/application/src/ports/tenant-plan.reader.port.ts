export interface ITenantPlanReader {
  getPlanCode(tenantId: string): Promise<string>;
  getMaxCustomers(tenantId: string): Promise<number>;
  getMaxActiveSales(tenantId: string): Promise<number>;
  getMaxBranches(tenantId: string): Promise<number>;
  getMaxStaff(tenantId: string): Promise<number>;
}
