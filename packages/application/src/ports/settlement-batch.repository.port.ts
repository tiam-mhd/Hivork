import type { PaymentLedgerEntryRecord } from './payment-ledger.repository.port.js';
import type { OutboxTransaction } from './outbox.port.js';

export type SettlementBatchRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  batchNumber: string;
  status: 'OPEN' | 'CLOSED';
  periodFrom: Date;
  periodTo: Date;
  totalAmountRial: bigint;
  entryCount: number;
  note: string | null;
  closedAt: Date | null;
  closedById: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SettlementBatchEntryRecord = {
  id: string;
  settlementBatchId: string;
  ledgerEntryId: string;
  createdAt: Date;
};

export type SettlementBatchDetailRecord = SettlementBatchRecord & {
  entries: Array<SettlementBatchEntryRecord & { ledgerEntry: PaymentLedgerEntryRecord }>;
};

export type FindEligibleSettlementEntriesInput = {
  tenantId: string;
  branchId: string;
  paymentMethods: string[];
  periodFrom: Date;
  periodTo: Date;
};

export type PersistSettlementBatchInput = {
  id: string;
  tenantId: string;
  branchId: string;
  batchNumber: string;
  periodFrom: Date;
  periodTo: Date;
  totalAmountRial: bigint;
  entryCount: number;
  note?: string | null;
  paymentMethods: string[];
  ledgerEntryIds: string[];
  createdById: string;
};

export type PersistSettlementBatchCloseInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  closedAt: Date;
  closedById: string;
  updatedById: string;
};

export type CloseSettlementBatchPersistResult =
  | { outcome: 'updated'; batch: SettlementBatchRecord }
  | { outcome: 'not_found' }
  | { outcome: 'already_closed' }
  | { outcome: 'version_conflict'; currentVersion: number };

export type ListSettlementBatchesQuery = {
  branchIds?: string[];
  status?: 'OPEN' | 'CLOSED';
  limit: number;
  cursor?: { createdAt: Date; id: string };
};

export type SettlementBatchListPage = {
  items: SettlementBatchRecord[];
  hasMore: boolean;
};

export type SettlementBatchLedgerReconciliationEntry = PaymentLedgerEntryRecord & {
  paymentAttemptMetadata: Record<string, unknown> | null;
};

export interface ISettlementBatchRepository {
  findEligibleLedgerEntries(
    input: FindEligibleSettlementEntriesInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord[]>;
  findLedgerEntriesInOpenBatch(
    tenantId: string,
    ledgerEntryIds: string[],
    tx?: OutboxTransaction,
  ): Promise<string[]>;
  findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<SettlementBatchRecord | null>;
  findByIdWithEntries(
    tenantId: string,
    id: string,
  ): Promise<SettlementBatchDetailRecord | null>;
  list(
    tenantId: string,
    options: ListSettlementBatchesQuery,
  ): Promise<SettlementBatchListPage>;
  createWithEntries(
    input: PersistSettlementBatchInput,
    tx: OutboxTransaction,
  ): Promise<SettlementBatchRecord>;
  listLedgerEntryIdsForBatch(
    tenantId: string,
    batchId: string,
    tx?: OutboxTransaction,
  ): Promise<Array<{ ledgerEntryId: string; paymentAttemptId: string | null }>>;
  close(
    input: PersistSettlementBatchCloseInput,
    tx: OutboxTransaction,
  ): Promise<CloseSettlementBatchPersistResult>;
  findLedgerEntriesForReconciliation(
    tenantId: string,
    settlementBatchId: string,
  ): Promise<SettlementBatchLedgerReconciliationEntry[]>;
}

export const SETTLEMENT_BATCH_REPOSITORY = Symbol('SETTLEMENT_BATCH_REPOSITORY');
