export type StaffRoleAssignment = {
  staffId: string;
  roleId: string;
  role: {
    code: string;
    name: string;
  };
  assignedAt: Date;
};

export type AssignStaffRoleInput = {
  tenantId: string;
  staffId: string;
  roleId: string;
};

export type AssignStaffRoleResult = StaffRoleAssignment & {
  created: boolean;
};

export interface IStaffRoleRepository {
  findActiveAssignment(
    tenantId: string,
    staffId: string,
    roleId: string,
  ): Promise<StaffRoleAssignment | null>;
  assign(input: AssignStaffRoleInput): Promise<AssignStaffRoleResult>;
  remove(tenantId: string, staffId: string, roleId: string): Promise<void>;
  countStaffWithOwnerRole(tenantId: string): Promise<number>;
}
