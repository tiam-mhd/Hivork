import { describe, expect, it } from 'vitest';

import {
  assertCustomerOwnershipTransferAllowed,
  buildCustomerOwnershipTransferFields,
  type CustomerOwnershipTransferSnapshot,
} from './customer-ownership-transfer.service.js';

function buildSnapshot(
  overrides: Partial<CustomerOwnershipTransferSnapshot> = {},
): CustomerOwnershipTransferSnapshot {
  return {
    currentAssignedStaffId: '00000000-0000-4000-8000-000000000001',
    targetAssignedStaffId: '00000000-0000-4000-8000-000000000002',
    status: 'active',
    existingMetadata: null,
    ...overrides,
  };
}

describe('assertCustomerOwnershipTransferAllowed', () => {
  it('rejects archived customers', () => {
    expect(() =>
      assertCustomerOwnershipTransferAllowed(buildSnapshot({ status: 'archived' })),
    ).toThrow(expect.objectContaining({ code: 'CUSTOMER_ARCHIVED' }));
  });

  it('rejects noop transfer to same staff', () => {
    const staffId = '00000000-0000-4000-8000-000000000099';
    expect(() =>
      assertCustomerOwnershipTransferAllowed(
        buildSnapshot({
          currentAssignedStaffId: staffId,
          targetAssignedStaffId: staffId,
        }),
      ),
    ).toThrow(expect.objectContaining({ code: 'NOOP_TRANSFER' }));
  });
});

describe('buildCustomerOwnershipTransferFields', () => {
  it('appends transfer history and trims to 50 entries', () => {
    const existingHistory = Array.from({ length: 50 }, (_, index) => ({
      fromStaffId: null,
      toStaffId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      byStaffId: '00000000-0000-4000-8000-000000000010',
    }));

    const result = buildCustomerOwnershipTransferFields(
      buildSnapshot({
        existingMetadata: { transferHistory: existingHistory },
      }),
      {
        actorStaffId: '00000000-0000-4000-8000-000000000010',
        transferredAt: new Date('2026-07-01T12:00:00.000Z'),
        note: 'handover',
      },
    );

    expect(result.assignedStaffId).toBe('00000000-0000-4000-8000-000000000002');
    const history = result.metadata.transferHistory as unknown[];
    expect(history).toHaveLength(50);
    expect(history.at(-1)).toEqual(
      expect.objectContaining({
        fromStaffId: '00000000-0000-4000-8000-000000000001',
        toStaffId: '00000000-0000-4000-8000-000000000002',
        note: 'handover',
      }),
    );
    expect(history[0]).toEqual(existingHistory[1]);
  });

  it('allows transfer from unassigned customer', () => {
    const result = buildCustomerOwnershipTransferFields(
      buildSnapshot({ currentAssignedStaffId: null }),
      {
        actorStaffId: '00000000-0000-4000-8000-000000000010',
        transferredAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    );

    expect(result.metadata.transferHistory).toEqual([
      expect.objectContaining({ fromStaffId: null }),
    ]);
  });
});
