export interface IStaffActiveBranchStore {
  get(staffId: string): Promise<string | null>;
  set(staffId: string, branchId: string | null, ttlSeconds: number): Promise<void>;
}
