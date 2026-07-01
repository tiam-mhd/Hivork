import { describe, expect, it } from 'vitest';

import { sumTodayDueAmountRial } from './today-due-report.utils';

describe('sumTodayDueAmountRial', () => {
  it('sums installment amounts from page data', () => {
    const total = sumTodayDueAmountRial([
      {
        id: '11111111-1111-4111-8111-111111111111',
        saleId: '22222222-2222-4222-8222-222222222222',
        customer: {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'علی',
          phone: '09121234567',
        },
        branchId: '44444444-4444-4444-8444-444444444444',
        sequenceNumber: 1,
        dueDate: '2026-06-29T00:00:00.000Z',
        amountRial: '10000000',
        status: 'pending',
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        saleId: '66666666-6666-4666-8666-666666666666',
        customer: {
          id: '77777777-7777-4777-8777-777777777777',
          name: 'مریم',
          phone: '09129876543',
        },
        branchId: '44444444-4444-4444-8444-444444444444',
        sequenceNumber: 2,
        dueDate: '2026-06-29T00:00:00.000Z',
        amountRial: '5000000',
        status: 'overdue',
      },
    ]);

    expect(total).toBe(15_000_000n);
  });

  it('returns zero for empty list', () => {
    expect(sumTodayDueAmountRial([])).toBe(0n);
  });
});
