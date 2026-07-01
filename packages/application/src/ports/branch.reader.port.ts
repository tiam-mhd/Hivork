export interface IBranchReader {
  existsActiveInTenant(tenantId: string, branchId: string): Promise<boolean>;
}
