import {
  generateRegeneratedInstallmentSchedule,
  InstallmentOperationsService,
  InstallmentStatus,
  MergeSplitPolicy,
  sumAmountsRial,
} from '@hivork/domain';
import { describe, expect, it } from 'vitest';

describe('SplitInstallmentUseCase (domain delegation)', () => {
  it('preserves total on three-way equal split', () => {
    const originalAmountRial = 6_000_001n;
    const schedule = generateRegeneratedInstallmentSchedule({
      totalAmountRial: originalAmountRial,
      installmentCount: 3,
      startSequenceNumber: 5,
      roundingPolicy: 'last_installment_absorbs_remainder',
      firstDueDate: new Date('2026-08-01T12:00:00.000Z'),
      intervalDays: 30,
    });

    const partAmountsRial = schedule.map((item) => item.amountRial);
    const validation = InstallmentOperationsService.validateSplit({
      installment: {
        id: 'inst-1',
        saleId: 'sale-1',
        sequenceNumber: 5,
        dueDate: new Date('2026-07-01T12:00:00.000Z'),
        amountRial: originalAmountRial,
        status: InstallmentStatus.PENDING,
      },
      partAmountsRial,
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(true);
    expect(sumAmountsRial(partAmountsRial)).toBe(originalAmountRial);
    expect(partAmountsRial).toEqual([2_000_000n, 2_000_000n, 2_000_001n]);
  });

  it('accepts explicit parts that sum to the original amount', () => {
    const validation = InstallmentOperationsService.validateSplit({
      installment: {
        id: 'inst-1',
        saleId: 'sale-1',
        sequenceNumber: 5,
        dueDate: new Date('2026-07-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.PENDING,
      },
      partAmountsRial: [3_000_000n, 2_000_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(true);
  });

  it('rejects explicit parts when sum does not match', () => {
    const validation = InstallmentOperationsService.validateSplit({
      installment: {
        id: 'inst-1',
        saleId: 'sale-1',
        sequenceNumber: 5,
        dueDate: new Date('2026-07-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.PENDING,
      },
      partAmountsRial: [3_000_000n, 1_000_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error).toBe('AMOUNT_MISMATCH');
    }
  });

  it('rejects split when part count is below minimum', () => {
    const validation = InstallmentOperationsService.validateSplit({
      installment: {
        id: 'inst-1',
        saleId: 'sale-1',
        sequenceNumber: 5,
        dueDate: new Date('2026-07-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.PENDING,
      },
      partAmountsRial: [5_000_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error).toBe('SPLIT_INVALID_PARTS');
    }
  });

  it('rejects split on paid installment', () => {
    const validation = InstallmentOperationsService.validateSplit({
      installment: {
        id: 'inst-1',
        saleId: 'sale-1',
        sequenceNumber: 5,
        dueDate: new Date('2026-07-01T12:00:00.000Z'),
        amountRial: 5_000_000n,
        status: InstallmentStatus.PAID,
      },
      partAmountsRial: [2_500_000n, 2_500_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error).toBe('INSTALLMENT_STATUS_INVALID');
    }
  });
});
