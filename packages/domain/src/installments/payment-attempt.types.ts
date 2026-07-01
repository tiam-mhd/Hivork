export enum ReportedByType {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
}

export enum PaymentAttemptStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export interface PaymentAttemptProps {
  id: string;
  installmentId: string;
  tenantId: string;
  reportedByType: ReportedByType;
  reportedById: string;
  amountRial: bigint;
  status: PaymentAttemptStatus;
  evidenceFileId: string | null;
  note: string | null;
  confirmedByStaffId: string | null;
  rejectedReason: string | null;
  idempotencyKey: string | null;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportPaymentInput {
  installmentId: string;
  tenantId: string;
  reportedByType: ReportedByType;
  reportedById: string;
  amountRial: bigint;
  note?: string;
  evidenceFileId?: string;
  idempotencyKey?: string;
}

/** Input for BR-014 auto-confirm decision (state-machines.md). */
export interface AutoConfirmInput {
  reportedByType: ReportedByType;
  requireSellerConfirmation: boolean;
}
