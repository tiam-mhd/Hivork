export interface IStaffPermissionsCache {
  get(staffId: string): Promise<string[] | null>;
  set(staffId: string, permissions: string[], ttlSeconds: number): Promise<void>;
}
