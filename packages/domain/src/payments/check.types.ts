export enum CheckType {
  RECEIVED = 'RECEIVED',
  PAYABLE = 'PAYABLE',
}

export enum CheckStatus {
  REGISTERED = 'REGISTERED',
  DUE = 'DUE',
  COLLECTED = 'COLLECTED',
  BOUNCED = 'BOUNCED',
  TRANSFERRED = 'TRANSFERRED',
  CANCELLED = 'CANCELLED',
}

export interface RegisterCheckInput {
  id?: string;
  tenantId: string;
  branchId: string;
  checkType: CheckType;
  checkNumber: string;
  bankName: string;
  amountRial: bigint;
  dueDate: Date;
  drawerName: string;
  bankBranchCode?: string | null;
  payeeName?: string | null;
  sayadId?: string | null;
  paymentAttemptId?: string | null;
  installmentId?: string | null;
  saleId?: string | null;
  imageFileId?: string | null;
  createdById?: string | null;
}

export interface CheckProps {
  id: string;
  tenantId: string;
  branchId: string;
  checkType: CheckType;
  status: CheckStatus;
  checkNumber: string;
  bankName: string;
  bankBranchCode: string | null;
  amountRial: bigint;
  dueDate: Date;
  drawerName: string;
  payeeName: string | null;
  sayadId: string | null;
  paymentAttemptId: string | null;
  ledgerEntryId: string | null;
  installmentId: string | null;
  saleId: string | null;
  imageFileId: string | null;
  collectedAt: Date | null;
  collectedByStaffId: string | null;
  bouncedAt: Date | null;
  bounceReason: string | null;
  transferredTo: string | null;
  transferredAt: Date | null;
  transferredByStaffId: string | null;
  cancelledAt: Date | null;
  cancelledByStaffId: string | null;
  trackingNotes: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
}

export interface RegisterPayableCheckInput {
  id?: string;
  tenantId: string;
  branchId: string;
  checkNumber: string;
  bankName: string;
  amountRial: bigint;
  dueDate: Date;
  payeeName: string;
  drawerName?: string | null;
  bankBranchCode?: string | null;
  sayadId?: string | null;
  createdById?: string | null;
}

export interface BounceCheckOptions {
  /** When true, allows bouncing a collected received check (tenant setting). */
  allowBounceAfterCollect?: boolean;
}

export interface MarkDueOptions {
  /** When true, allows transition before dueDate (staff action). */
  manual?: boolean;
}
