export type StaffSecurityAuditListItem = {
  id: string;
  action: string;
  createdAt: Date;
  ipAddress: string | null;
  metadata: Record<string, unknown> | undefined;
};

export type ListStaffSecurityAuditOptions = {
  tenantId: string;
  staffId: string;
  cursor?: string;
  limit: number;
};

export type ListStaffSecurityAuditResult = {
  items: StaffSecurityAuditListItem[];
  hasNext: boolean;
};

export interface IStaffSecurityAuditRepository {
  listForStaff(options: ListStaffSecurityAuditOptions): Promise<ListStaffSecurityAuditResult>;
}
