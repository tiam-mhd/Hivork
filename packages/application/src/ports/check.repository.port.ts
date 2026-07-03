import type { OutboxTransaction } from './outbox.port.js';

export type CheckTypeValue = 'RECEIVED' | 'PAYABLE';

export type CheckStatusValue =
  | 'REGISTERED'
  | 'DUE'
  | 'COLLECTED'
  | 'BOUNCED'
  | 'TRANSFERRED'
  | 'CANCELLED';

export type CheckRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  checkType: CheckTypeValue;
  status: CheckStatusValue;
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
  bouncedAt: Date | null;
  bounceReason: string | null;
  transferredTo: string | null;
  transferredAt: Date | null;
  trackingNotes: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PersistCheckInput = {
  id: string;
  tenantId: string;
  branchId: string;
  checkType: CheckTypeValue;
  status: CheckStatusValue;
  checkNumber: string;
  bankName: string;
  bankBranchCode?: string | null;
  amountRial: bigint;
  dueDate: Date;
  drawerName: string;
  payeeName?: string | null;
  sayadId?: string | null;
  paymentAttemptId?: string | null;
  installmentId?: string | null;
  saleId?: string | null;
  imageFileId?: string | null;
  trackingNotes?: string | null;
  createdById: string;
  metadata?: Record<string, unknown> | null;
};

export type PersistCheckCollectedInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  collectedAt: Date;
  ledgerEntryId: string;
  updatedById: string;
  metadata: Record<string, unknown> | null;
};

export type PersistCheckCollectedResult =
  | { outcome: 'updated'; check: CheckRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number };

export type PersistCheckTransferredInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  transferredTo: string;
  transferredAt: Date;
  updatedById: string;
  metadata: Record<string, unknown> | null;
};

export type PersistCheckTransferredResult =
  | { outcome: 'updated'; check: CheckRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number };

export type PersistCheckBouncedInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  status: CheckStatusValue;
  bounceReason: string;
  bouncedAt: Date;
  updatedById: string;
};

export type PersistCheckBouncedResult =
  | { outcome: 'updated'; check: CheckRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number };

export type ListChecksQuery = {
  branchIds?: string[];
  checkType?: CheckTypeValue;
  status?: CheckStatusValue;
  dueFrom?: Date;
  dueTo?: Date;
  limit: number;
  cursor?: { createdAt: Date; id: string };
};

export type CheckListPage = {
  items: CheckRecord[];
  hasMore: boolean;
};

export type PersistCheckImageUpdateInput = {
  tenantId: string;
  id: string;
  expectedVersion: number;
  imageFileId: string;
  updatedById: string;
};

export type PersistCheckImageUpdateResult =
  | { outcome: 'updated'; check: CheckRecord }
  | { outcome: 'not_found' }
  | { outcome: 'version_conflict'; currentVersion: number };

export interface ICheckRepository {
  findActiveByCheckNumber(
    tenantId: string,
    bankName: string,
    checkNumber: string,
    tx?: OutboxTransaction,
  ): Promise<CheckRecord | null>;
  findByCollectIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: OutboxTransaction,
  ): Promise<CheckRecord | null>;
  create(input: PersistCheckInput, tx: OutboxTransaction): Promise<CheckRecord>;
  findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<CheckRecord | null>;
  markCollected(
    input: PersistCheckCollectedInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckCollectedResult>;
  markTransferred(
    input: PersistCheckTransferredInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckTransferredResult>;
  markBounced(
    input: PersistCheckBouncedInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckBouncedResult>;
  updateImageFile(
    input: PersistCheckImageUpdateInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckImageUpdateResult>;
  list(tenantId: string, options: ListChecksQuery): Promise<CheckListPage>;
}

export const CHECK_REPOSITORY = Symbol('CHECK_REPOSITORY');
