export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

export interface InstallmentDraft {
  saleId: string;
  tenantId: string;
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
  status: InstallmentStatus;
}

export interface InstallmentProps {
  id: string;
  saleId: string;
  tenantId: string;
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
  status: InstallmentStatus;
  paidAt: Date | null;
  confirmedByStaffId: string | null;
  waivedByStaffId: string | null;
  waiveReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal installment state for sale lifecycle decisions (cancel, complete, soft delete). */
export interface InstallmentSnapshot {
  status: InstallmentStatus;
}
