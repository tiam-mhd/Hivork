import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';
import {
  assertCustomerMergeAllowed,
  mergeCustomerFields,
  type CustomerMergeSnapshot,
} from './customer-merge.service.js';

function buildSnapshot(overrides: Partial<CustomerMergeSnapshot> = {}): CustomerMergeSnapshot {
  return {
    sourceId: '00000000-0000-4000-8000-000000000001',
    targetId: '00000000-0000-4000-8000-000000000002',
    sourceTags: ['vip'],
    targetTags: ['loyal'],
    sourceNotes: 'source note',
    targetNotes: 'target note',
    sourceInternalNotes: null,
    targetInternalNotes: 'internal',
    sourceCreditScore: 80,
    targetCreditScore: 95,
    sourceOverdueCount: 1,
    targetOverdueCount: 2,
    sourceTotalPurchaseRial: 1_000_000n,
    targetTotalPurchaseRial: 2_000_000n,
    sourceLastPurchaseAt: new Date('2026-06-01T00:00:00.000Z'),
    targetLastPurchaseAt: new Date('2026-07-01T00:00:00.000Z'),
    sourceMetadata: null,
    targetMetadata: { existing: true },
    sourceStatus: 'active',
    targetStatus: 'active',
    sourceIsBlacklisted: false,
    targetIsBlacklisted: false,
    sourceDeletedAt: null,
    targetDeletedAt: null,
    ...overrides,
  };
}

describe('assertCustomerMergeAllowed', () => {
  it('rejects same source and target', () => {
    const id = '00000000-0000-4000-8000-000000000099';
    expect(() =>
      assertCustomerMergeAllowed(buildSnapshot({ sourceId: id, targetId: id })),
    ).toThrow(DomainError);
  });

  it('rejects blacklisted customers', () => {
    expect(() =>
      assertCustomerMergeAllowed(buildSnapshot({ sourceIsBlacklisted: true })),
    ).toThrow(expect.objectContaining({ code: 'MERGE_BLACKLISTED' }));
  });

  it('rejects deleted source or target', () => {
    expect(() =>
      assertCustomerMergeAllowed(
        buildSnapshot({ sourceDeletedAt: new Date('2026-07-01T00:00:00.000Z') }),
      ),
    ).toThrow(expect.objectContaining({ code: 'MERGE_SOURCE_DELETED' }));

    expect(() =>
      assertCustomerMergeAllowed(
        buildSnapshot({ targetDeletedAt: new Date('2026-07-01T00:00:00.000Z') }),
      ),
    ).toThrow(expect.objectContaining({ code: 'MERGE_TARGET_DELETED' }));
  });

  it('rejects non-active customers', () => {
    expect(() =>
      assertCustomerMergeAllowed(buildSnapshot({ sourceStatus: 'archived' })),
    ).toThrow(expect.objectContaining({ code: 'MERGE_NOT_ACTIVE' }));
  });
});

describe('mergeCustomerFields', () => {
  it('merges tags, financial aggregates, and merge history', () => {
    const merged = mergeCustomerFields(buildSnapshot(), {
      reason: 'duplicate profile',
      actorId: '00000000-0000-4000-8000-000000000010',
      mergedAt: new Date('2026-07-01T12:00:00.000Z'),
    });

    expect(merged.tags).toEqual(['loyal', 'vip']);
    expect(merged.creditScore).toBe(95);
    expect(merged.overdueCount).toBe(3);
    expect(merged.totalPurchaseRial).toBe(3_000_000n);
    expect(merged.notes).toContain('target note');
    expect(merged.notes).toContain('source note');
    expect(merged.metadata.existing).toBe(true);
    expect(merged.metadata.mergeHistory).toEqual([
      expect.objectContaining({
        sourceTenantCustomerId: '00000000-0000-4000-8000-000000000001',
        reason: 'duplicate profile',
      }),
    ]);
  });
});
