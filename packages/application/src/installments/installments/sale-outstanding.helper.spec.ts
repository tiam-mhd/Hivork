import { describe, expect, it } from 'vitest';

import { computeSaleOutstandingRial } from './sale-outstanding.helper.js';
import type { InstallmentRecord } from '../../ports/installment.repository.port.js';

function row(
  status: InstallmentRecord['status'],
  amountRial: bigint,
): InstallmentRecord {
  return {
    id: 'inst-1',
    saleId: 'sale-1',
    tenantId: 'tenant-1',
    sequenceNumber: 1,
    dueDate: new Date(),
    amountRial,
    status,
    paidAt: null,
    confirmedByStaffId: null,
    waivedByStaffId: null,
    waiveReason: null,
    version: 1,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('computeSaleOutstandingRial', () => {
  it('sums pending and overdue only', () => {
    const total = computeSaleOutstandingRial([
      row('PENDING', 5_000_000n),
      row('OVERDUE', 2_000_000n),
      row('PAID', 1_000_000n),
      row('WAIVED', 3_000_000n),
    ]);

    expect(total).toBe(7_000_000n);
  });
});
