import { DomainError } from '../../errors/domain.error.js';

import type { TenantCustomerStatus } from './tenant-customer.entity.js';

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;
const MAX_NOTES_LENGTH = 1000;

export type CustomerMergeSnapshot = {
  sourceId: string;
  targetId: string;
  sourceTags: string[];
  targetTags: string[];
  sourceNotes: string | null;
  targetNotes: string | null;
  sourceInternalNotes: string | null;
  targetInternalNotes: string | null;
  sourceCreditScore: number;
  targetCreditScore: number;
  sourceOverdueCount: number;
  targetOverdueCount: number;
  sourceTotalPurchaseRial: bigint;
  targetTotalPurchaseRial: bigint;
  sourceLastPurchaseAt: Date | null;
  targetLastPurchaseAt: Date | null;
  sourceMetadata: Record<string, unknown> | null;
  targetMetadata: Record<string, unknown> | null;
  sourceStatus: TenantCustomerStatus;
  targetStatus: TenantCustomerStatus;
  sourceIsBlacklisted: boolean;
  targetIsBlacklisted: boolean;
  sourceDeletedAt: Date | null;
  targetDeletedAt: Date | null;
};

export type CustomerMergeHistoryEntry = {
  mergedAt: string;
  sourceTenantCustomerId: string;
  reason: string;
  actorStaffId: string;
};

export type MergedCustomerFields = {
  tags: string[];
  notes: string | null;
  internalNotes: string | null;
  creditScore: number;
  overdueCount: number;
  totalPurchaseRial: bigint;
  lastPurchaseAt: Date | null;
  metadata: Record<string, unknown>;
};

export function assertCustomerMergeAllowed(snapshot: CustomerMergeSnapshot): void {
  if (snapshot.sourceId === snapshot.targetId) {
    throw new DomainError('MERGE_SAME_CUSTOMER');
  }

  if (snapshot.sourceDeletedAt) {
    throw new DomainError('MERGE_SOURCE_DELETED');
  }

  if (snapshot.targetDeletedAt) {
    throw new DomainError('MERGE_TARGET_DELETED');
  }

  if (snapshot.sourceStatus !== 'active' || snapshot.targetStatus !== 'active') {
    throw new DomainError('MERGE_NOT_ACTIVE');
  }

  if (snapshot.sourceIsBlacklisted || snapshot.targetIsBlacklisted) {
    throw new DomainError('MERGE_BLACKLISTED');
  }
}

export function mergeCustomerFields(
  snapshot: CustomerMergeSnapshot,
  params: { reason: string; actorId: string; mergedAt: Date },
): MergedCustomerFields {
  return {
    tags: unionTags(snapshot.sourceTags, snapshot.targetTags),
    notes: appendNotes(snapshot.targetNotes, snapshot.sourceNotes),
    internalNotes: appendNotes(snapshot.targetInternalNotes, snapshot.sourceInternalNotes),
    creditScore: Math.max(snapshot.sourceCreditScore, snapshot.targetCreditScore),
    overdueCount: snapshot.sourceOverdueCount + snapshot.targetOverdueCount,
    totalPurchaseRial: snapshot.sourceTotalPurchaseRial + snapshot.targetTotalPurchaseRial,
    lastPurchaseAt: maxDate(snapshot.sourceLastPurchaseAt, snapshot.targetLastPurchaseAt),
    metadata: appendMergeHistory(snapshot.targetMetadata, {
      mergedAt: params.mergedAt.toISOString(),
      sourceTenantCustomerId: snapshot.sourceId,
      reason: params.reason.trim(),
      actorStaffId: params.actorId,
    }),
  };
}

function unionTags(sourceTags: string[], targetTags: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const tag of [...targetTags, ...sourceTags]) {
    const normalized = tag.trim();
    if (!normalized || normalized.length > MAX_TAG_LENGTH) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(normalized);

    if (merged.length >= MAX_TAGS) {
      break;
    }
  }

  return merged;
}

function appendNotes(targetNotes: string | null, sourceNotes: string | null): string | null {
  const left = targetNotes?.trim() ?? '';
  const right = sourceNotes?.trim() ?? '';

  if (!left && !right) {
    return null;
  }

  if (!left) {
    return right.slice(0, MAX_NOTES_LENGTH);
  }

  if (!right) {
    return left.slice(0, MAX_NOTES_LENGTH);
  }

  return `${left}\n---\n${right}`.slice(0, MAX_NOTES_LENGTH);
}

function maxDate(left: Date | null, right: Date | null): Date | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.getTime() >= right.getTime() ? left : right;
}

function appendMergeHistory(
  existingMetadata: Record<string, unknown> | null,
  entry: CustomerMergeHistoryEntry,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
      ? { ...existingMetadata }
      : {};

  const history = Array.isArray(base.mergeHistory)
    ? [...(base.mergeHistory as CustomerMergeHistoryEntry[])]
    : [];

  history.push(entry);
  base.mergeHistory = history;

  return base;
}
