import { DomainError } from '../../errors/domain.error.js';

import type { TenantCustomerStatus } from './tenant-customer.entity.js';

const MAX_TRANSFER_HISTORY = 50;

export type CustomerOwnershipTransferSnapshot = {
  currentAssignedStaffId: string | null;
  targetAssignedStaffId: string;
  status: TenantCustomerStatus;
  existingMetadata: Record<string, unknown> | null;
};

export type CustomerTransferHistoryEntry = {
  fromStaffId: string | null;
  toStaffId: string;
  at: string;
  byStaffId: string;
  note?: string;
};

export type CustomerOwnershipTransferFields = {
  assignedStaffId: string;
  metadata: Record<string, unknown>;
};

export function assertCustomerOwnershipTransferAllowed(
  snapshot: CustomerOwnershipTransferSnapshot,
): void {
  if (snapshot.status === 'archived') {
    throw new DomainError('CUSTOMER_ARCHIVED');
  }

  if (snapshot.currentAssignedStaffId === snapshot.targetAssignedStaffId) {
    throw new DomainError('NOOP_TRANSFER');
  }
}

export function buildCustomerOwnershipTransferFields(
  snapshot: CustomerOwnershipTransferSnapshot,
  params: { actorStaffId: string; transferredAt: Date; note?: string },
): CustomerOwnershipTransferFields {
  return {
    assignedStaffId: snapshot.targetAssignedStaffId,
    metadata: appendTransferHistory(snapshot.existingMetadata, {
      fromStaffId: snapshot.currentAssignedStaffId,
      toStaffId: snapshot.targetAssignedStaffId,
      at: params.transferredAt.toISOString(),
      byStaffId: params.actorStaffId,
      ...(params.note?.trim() ? { note: params.note.trim() } : {}),
    }),
  };
}

function appendTransferHistory(
  existingMetadata: Record<string, unknown> | null,
  entry: CustomerTransferHistoryEntry,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
      ? { ...existingMetadata }
      : {};

  const history = Array.isArray(base.transferHistory)
    ? [...(base.transferHistory as CustomerTransferHistoryEntry[])]
    : [];

  history.push(entry);

  base.transferHistory =
    history.length > MAX_TRANSFER_HISTORY
      ? history.slice(history.length - MAX_TRANSFER_HISTORY)
      : history;

  return base;
}
