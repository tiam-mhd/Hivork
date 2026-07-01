import type { DataScope } from '@hivork/domain';

export type StaffContext = {
  id: string;
  tenantId: string;
  dataScope: DataScope;
  assignedBranchIds: string[];
  primaryBranchId: string | null;
  activeBranchId: string | null;
};

export type CustomerContext = {
  id: string;
};
