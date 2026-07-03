import type { OutboxTransaction } from './outbox.port.js';

export type InstallmentOperationLogRecord = {
  id: string;
  tenantId: string;
  saleId: string;
  operationType: string;
  installmentIds: string[];
  previousSnapshot: unknown;
  newSnapshot: unknown;
  reason: string | null;
  performedById: string;
  createdAt: Date;
  createdById: string | null;
  version: number;
  metadata: unknown | null;
};

export type AppendInstallmentOperationLogInput = {
  tenantId: string;
  saleId: string;
  operationType: string;
  installmentIds: string[];
  previousSnapshot: unknown;
  newSnapshot: unknown;
  reason?: string;
  performedById: string;
  createdById: string;
  metadata?: unknown;
};

export interface IInstallmentOperationLogRepository {
  append(
    input: AppendInstallmentOperationLogInput,
    tx?: OutboxTransaction,
  ): Promise<InstallmentOperationLogRecord>;
  findLatestDeferLogForInstallment(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<InstallmentOperationLogRecord | null>;
}

export const INSTALLMENT_OPERATION_LOG_REPOSITORY = Symbol('INSTALLMENT_OPERATION_LOG_REPOSITORY');
