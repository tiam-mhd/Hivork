import type { PaymentAttemptStatus, ReportedByType } from '@prisma/client';

/**
 * PaymentAttempt persistence port — TASK-063 / Phase 3 use cases.
 *
 * ADR-008: reporting payment ≠ confirming payment.
 * Idempotency: `Idempotency-Key` header → unique `(tenantId, idempotencyKey)`.
 */
export type PaymentAttemptRecord = {
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
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePaymentAttemptInput = {
  tenantId: string;
  installmentId: string;
  reportedByType: ReportedByType;
  reportedById: string;
  amountRial: bigint;
  note?: string | null;
  evidenceFileId?: string | null;
  idempotencyKey?: string | null;
  createdById: string;
  requestHash: string;
};

export interface IPaymentAttemptRepository {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<PaymentAttemptRecord | null>;
  findPendingByInstallmentId(
    tenantId: string,
    installmentId: string,
  ): Promise<PaymentAttemptRecord | null>;
  create(input: CreatePaymentAttemptInput): Promise<PaymentAttemptRecord>;
}
