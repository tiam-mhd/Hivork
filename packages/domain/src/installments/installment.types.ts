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

/** Full installment state captured in operation logs (IFP-079). */
export interface InstallmentOperationSnapshot {
  id: string;
  saleId: string;
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
  status: InstallmentStatus;
}

export type InstallmentOperationType =
  | 'reschedule'
  | 'defer'
  | 'accelerate'
  | 'regenerate'
  | 'merge'
  | 'split';

/** Append-only audit concept — persisted by application use cases (IFP-080+). */
export type InstallmentOperationLog = {
  operationType: InstallmentOperationType;
  installmentIds: string[];
  previousSnapshot: InstallmentOperationSnapshot[];
  newSnapshot: InstallmentOperationSnapshot[];
  reason?: string;
  performedByStaffId: string;
};
