export interface ITenantPlanReader {
  getMaxCustomers(tenantId: string): Promise<number>;
  getMaxActiveSales(tenantId: string): Promise<number>;
  getMaxBranches(tenantId: string): Promise<number>;
  getMaxStaff(tenantId: string): Promise<number>;
}
