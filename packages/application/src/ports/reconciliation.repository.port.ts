import type { OutboxTransaction } from './outbox.port.js';

export type ReconciliationDiscrepancyType =
  | 'MISSING_IN_SYSTEM'
  | 'MISSING_IN_BANK'
  | 'AMOUNT_MISMATCH';

export type ReconciliationDiscrepancyStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

export type ReconciliationReportRecord = {
  id: string;
  tenantId: string;
  settlementBatchId: string;
  matchedCount: number;
  discrepancyCount: number;
  bankTotalRial: bigint;
  systemTotalRial: bigint;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReconciliationDiscrepancyRecord = {
  id: string;
  tenantId: string;
  reconciliationReportId: string;
  discrepancyType: ReconciliationDiscrepancyType;
  status: ReconciliationDiscrepancyStatus;
  bankReference: string | null;
  bankAmountRial: bigint | null;
  ledgerEntryId: string | null;
  systemAmountRial: bigint | null;
  resolveNote: string | null;
  resolvedAt: Date | null;
  resolvedById: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReconciliationReportDetailRecord = ReconciliationReportRecord & {
  discrepancies: ReconciliationDiscrepancyRecord[];
};

export type PersistReconciliationDiscrepancyInput = {
  id: string;
  tenantId: string;
  reconciliationReportId: string;
  discrepancyType: ReconciliationDiscrepancyType;
  bankReference?: string | null;
  bankAmountRial?: bigint | null;
  ledgerEntryId?: string | null;
  systemAmountRial?: bigint | null;
  createdById: string;
};

export type PersistReconciliationReportInput = {
  id: string;
  tenantId: string;
  settlementBatchId: string;
  matchedCount: number;
  discrepancyCount: number;
  bankTotalRial: bigint;
  systemTotalRial: bigint;
  discrepancies: PersistReconciliationDiscrepancyInput[];
  createdById: string;
};

export type ResolveReconciliationDiscrepancyInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  resolveNote: string;
  resolvedAt: Date;
  resolvedById: string;
  updatedById: string;
};

export type ResolveReconciliationDiscrepancyResult =
  | { outcome: 'updated'; discrepancy: ReconciliationDiscrepancyRecord }
  | { outcome: 'not_found' }
  | { outcome: 'already_resolved' }
  | { outcome: 'version_conflict'; currentVersion: number };

export interface IReconciliationRepository {
  findReportById(
    tenantId: string,
    id: string,
  ): Promise<ReconciliationReportDetailRecord | null>;
  createReportWithDiscrepancies(
    input: PersistReconciliationReportInput,
    tx: OutboxTransaction,
  ): Promise<ReconciliationReportDetailRecord>;
  findDiscrepancyById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<ReconciliationDiscrepancyRecord | null>;
  resolveDiscrepancy(
    input: ResolveReconciliationDiscrepancyInput,
    tx: OutboxTransaction,
  ): Promise<ResolveReconciliationDiscrepancyResult>;
}

export const RECONCILIATION_REPOSITORY = Symbol('RECONCILIATION_REPOSITORY');
