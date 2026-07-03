import {
  InstallmentOperationsService,
  InstallmentStatus,
  MergeSplitPolicy,
  sumAmountsRial,
} from '@hivork/domain';
import { describe, expect, it } from 'vitest';

describe('MergeInstallmentsUseCase (domain delegation)', () => {
  it('merges three installment amounts correctly', () => {
    const installments = [
      {
        id: 'a',
        saleId: 'sale-1',
        sequenceNumber: 4,
        dueDate: new Date('2026-10-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.PENDING,
      },
      {
        id: 'b',
        saleId: 'sale-1',
        sequenceNumber: 5,
        dueDate: new Date('2026-11-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.PENDING,
      },
      {
        id: 'c',
        saleId: 'sale-1',
        sequenceNumber: 6,
        dueDate: new Date('2026-12-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.OVERDUE,
      },
    ];

    const mergedAmountRial = sumAmountsRial(installments.map((item) => item.amountRial));
    const validation = InstallmentOperationsService.validateMerge({
      saleId: 'sale-1',
      installments,
      mergedAmountRial,
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(true);
    expect(mergedAmountRial).toBe(15_000_000n);
    expect(Math.min(...installments.map((item) => item.sequenceNumber))).toBe(4);
  });

  it('rejects merge when a paid installment is included', () => {
    const validation = InstallmentOperationsService.validateMerge({
      saleId: 'sale-1',
      installments: [
        {
          id: 'a',
          saleId: 'sale-1',
          sequenceNumber: 1,
          dueDate: new Date('2026-10-01T12:00:00.000Z'),
          amountRial: 5_000_000n,
          status: InstallmentStatus.PAID,
        },
        {
          id: 'b',
          saleId: 'sale-1',
          sequenceNumber: 2,
          dueDate: new Date('2026-11-01T12:00:00.000Z'),
          amountRial: 5_000_000n,
          status: InstallmentStatus.PENDING,
        },
      ],
      mergedAmountRial: 10_000_000n,
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error).toBe('INSTALLMENT_STATUS_INVALID');
    }
  });
});
