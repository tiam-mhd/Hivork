import { InstallmentStatus, type InstallmentOperationSnapshot } from '@hivork/domain';

import type { InstallmentRecord } from '../ports/installment.repository.port.js';

const PRISMA_TO_DOMAIN_STATUS: Record<string, InstallmentStatus> = {
  PENDING: InstallmentStatus.PENDING,
  OVERDUE: InstallmentStatus.OVERDUE,
  PAID: InstallmentStatus.PAID,
  WAIVED: InstallmentStatus.WAIVED,
};

export function installmentRecordToOperationSnapshot(
  record: InstallmentRecord,
): InstallmentOperationSnapshot {
  return {
    id: record.id,
    saleId: record.saleId,
    sequenceNumber: record.sequenceNumber,
    dueDate: record.dueDate,
    amountRial: record.amountRial,
    status: PRISMA_TO_DOMAIN_STATUS[record.status] ?? InstallmentStatus.PENDING,
  };
}

export function serializeOperationSnapshots(snapshots: InstallmentOperationSnapshot[]): unknown {
  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    saleId: snapshot.saleId,
    sequenceNumber: snapshot.sequenceNumber,
    dueDate: snapshot.dueDate.toISOString(),
    amountRial: snapshot.amountRial.toString(),
    status: snapshot.status,
  }));
}

export type InstallmentDeferHistoryEntry = {
  deferDays: number;
  previousDueDate: string;
  newDueDate: string;
  performedAt: string;
  performedById: string;
  reason?: string;
};

export type InstallmentDeferHistoryMetadata = {
  deferHistory: InstallmentDeferHistoryEntry[];
};

export function parseDeferHistoryMetadata(metadata: unknown): InstallmentDeferHistoryEntry[] {
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const history = (metadata as InstallmentDeferHistoryMetadata).deferHistory;
  return Array.isArray(history) ? history : [];
}

export function appendDeferHistoryEntry(
  existing: InstallmentDeferHistoryEntry[],
  entry: InstallmentDeferHistoryEntry,
): InstallmentDeferHistoryMetadata {
  return { deferHistory: [...existing, entry] };
}
