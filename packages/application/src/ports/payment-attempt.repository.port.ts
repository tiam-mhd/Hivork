import type { PaymentAttemptStatus, ReportedByType } from '@prisma/client';

import type { OutboxTransaction } from './outbox.port.js';

/**
 * PaymentAttempt persistence port — TASK-063 / IFP-087+.
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
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePaymentAttemptInput = {
  id: string;
  tenantId: string;
  installmentId: string;
  reportedByType: ReportedByType;
  reportedById: string;
  amountRial: bigint;
  note?: string | null;
  evidenceFileId?: string | null;
  idempotencyKey?: string | null;
  createdById: string;
  metadata: Record<string, unknown>;
};

export type UpdatePaymentAttemptMetadataInput = {
  tenantId: string;
  id: string;
  metadataPatch: Record<string, unknown>;
  updatedById?: string;
};

export type ConfirmPaymentAttemptInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  confirmedByStaffId: string;
  updatedById: string;
};

export type ConfirmPaymentAttemptResult =
  | { outcome: 'updated'; attempt: PaymentAttemptRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number }
  | { outcome: 'status_invalid'; status: PaymentAttemptStatus };

export type RejectPaymentAttemptInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  rejectedReason: string;
  updatedById: string;
};

export type RejectPaymentAttemptResult =
  | { outcome: 'updated'; attempt: PaymentAttemptRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number }
  | { outcome: 'status_invalid'; status: PaymentAttemptStatus };

export type VoidPaymentAttemptInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  metadata: Record<string, unknown>;
  updatedById: string;
};

export type VoidPaymentAttemptResult =
  | { outcome: 'updated'; attempt: PaymentAttemptRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number }
  | { outcome: 'status_invalid'; status: PaymentAttemptStatus };

export interface IPaymentAttemptRepository {
  findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  findByIdGlobal(id: string, tx?: OutboxTransaction): Promise<PaymentAttemptRecord | null>;
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  sumAllocatedAmountByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint>;
  sumConfirmedPrincipalAmountByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint>;
  create(input: CreatePaymentAttemptInput, tx?: OutboxTransaction): Promise<PaymentAttemptRecord>;
  findByBankReference(
    tenantId: string,
    bankName: string,
    referenceNumber: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  findByGatewayTransactionId(
    tenantId: string,
    gateway: string,
    transactionId: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  findByPosTrace(
    tenantId: string,
    terminalId: string,
    traceNumber: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  findByCheckNumber(
    tenantId: string,
    bankName: string,
    checkNumber: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  updateMetadata(
    input: UpdatePaymentAttemptMetadataInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null>;
  confirm(
    input: ConfirmPaymentAttemptInput,
    tx?: OutboxTransaction,
  ): Promise<ConfirmPaymentAttemptResult>;
  reject(
    input: RejectPaymentAttemptInput,
    tx?: OutboxTransaction,
  ): Promise<RejectPaymentAttemptResult>;
  void(
    input: VoidPaymentAttemptInput,
    tx?: OutboxTransaction,
  ): Promise<VoidPaymentAttemptResult>;
  listPendingByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord[]>;
  countPendingByMetadataMethods(
    tenantId: string,
    internalMethods: string[],
    tx?: OutboxTransaction,
  ): Promise<Map<string, number>>;
}

export const PAYMENT_ATTEMPT_REPOSITORY = Symbol('PAYMENT_ATTEMPT_REPOSITORY');
