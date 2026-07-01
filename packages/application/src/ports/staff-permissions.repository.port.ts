export type StaffPermissionSources = {
  rolePermissions: string[];
  grants: string[];
  denies: string[];
};

export interface IStaffPermissionsRepository {
  findPermissionSourcesByStaffId(staffId: string): Promise<StaffPermissionSources>;
}
