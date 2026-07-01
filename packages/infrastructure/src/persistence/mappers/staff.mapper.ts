import type { StaffListItem, StaffRecord } from '@hivork/application';

type StaffWithRoles = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  status: 'active' | 'suspended';
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  primaryBranchId: string | null;
  lastLoginAt: Date | null;
  invitedAt: Date | null;
  invitedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  user: { phone: string };
  staffRoles: { roleId: string; deletedAt: Date | null }[];
};

export function staffToRecord(row: StaffWithRoles): StaffRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    phone: row.user.phone,
    name: row.name,
    email: row.email,
    jobTitle: row.jobTitle,
    status: row.status,
    dataScope: row.dataScope,
    assignedBranchIds: row.assignedBranchIds,
    primaryBranchId: row.primaryBranchId,
    lastLoginAt: row.lastLoginAt,
    invitedAt: row.invitedAt,
    invitedById: row.invitedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
    roleIds: row.staffRoles.filter((sr) => sr.deletedAt === null).map((sr) => sr.roleId),
  };
}

export function staffToListItem(row: StaffWithRoles): StaffListItem {
  return {
    id: row.id,
    userId: row.userId,
    phone: row.user.phone,
    name: row.name,
    email: row.email,
    jobTitle: row.jobTitle,
    status: row.status,
    dataScope: row.dataScope,
    assignedBranchIds: row.assignedBranchIds,
    primaryBranchId: row.primaryBranchId,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    roleIds: row.staffRoles.filter((sr) => sr.deletedAt === null).map((sr) => sr.roleId),
  };
}
