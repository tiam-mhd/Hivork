import type { OutboxTransaction } from './outbox.port.js';

export type InstallmentAdjustmentType = 'PENALTY' | 'DISCOUNT';

export type InstallmentAdjustmentRecord = {
  id: string;
  tenantId: string;
  installmentId: string;
  adjustmentType: InstallmentAdjustmentType;
  amountRial: bigint;
  reason: string;
  appliedAt: Date;
  appliedById: string;
  reversedAt: Date | null;
};

export type CreateInstallmentAdjustmentInput = {
  tenantId: string;
  installmentId: string;
  adjustmentType: InstallmentAdjustmentType;
  amountRial: bigint;
  reason: string;
  appliedById: string;
  createdById: string;
};

export interface IInstallmentAdjustmentRepository {
  create(
    input: CreateInstallmentAdjustmentInput,
    tx?: OutboxTransaction,
  ): Promise<InstallmentAdjustmentRecord>;
  sumActivePenaltyRialByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint>;
  listRecentPenaltiesByInstallmentId(
    tenantId: string,
    installmentId: string,
    since: Date,
    tx?: OutboxTransaction,
  ): Promise<InstallmentAdjustmentRecord[]>;
}

export const INSTALLMENT_ADJUSTMENT_REPOSITORY = Symbol('INSTALLMENT_ADJUSTMENT_REPOSITORY');
