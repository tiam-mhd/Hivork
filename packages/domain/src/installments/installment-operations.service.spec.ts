import { describe, expect, it } from 'vitest';

import { addUtcDays } from './date.utils.js';
import { InstallmentOperationErrorCode } from './errors/installment-operation.errors.js';
import {
  InstallmentOperationsService,
  assertAmountConservation,
  sumAmountsRial,
} from './installment-operations.service.js';
import { InstallmentStatus, type InstallmentOperationSnapshot } from './installment.types.js';
import { SaleStatus } from './sale.types.js';
import { DeferPolicy } from './value-objects/defer-policy.vo.js';
import { MergeSplitPolicy } from './value-objects/merge-split-policy.vo.js';
import { ReschedulePolicy } from './value-objects/reschedule-policy.vo.js';

const SALE_ID = '00000000-0000-0000-0000-000000000011';
const NOW = new Date('2026-07-02T12:00:00.000Z');

function snapshot(
  overrides: Partial<InstallmentOperationSnapshot> = {},
): InstallmentOperationSnapshot {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    saleId: SALE_ID,
    sequenceNumber: 1,
    dueDate: new Date('2026-08-01T00:00:00.000Z'),
    amountRial: 5_000_000n,
    status: InstallmentStatus.PENDING,
    ...overrides,
  };
}

describe('InstallmentOperationsService — reschedule', () => {
  it('blocks reschedule on paid installment', () => {
    const result = InstallmentOperationsService.validateReschedule({
      installment: snapshot({ status: InstallmentStatus.PAID }),
      newDueDate: new Date('2026-09-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
    });
  });

  it('blocks reschedule on waived installment', () => {
    const result = InstallmentOperationsService.validateReschedule({
      installment: snapshot({ status: InstallmentStatus.WAIVED }),
      newDueDate: new Date('2026-09-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED,
    });
  });

  it('allows reschedule for pending installment with future date', () => {
    const result = InstallmentOperationsService.validateReschedule({
      installment: snapshot(),
      newDueDate: new Date('2026-09-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('allows reschedule for overdue installment', () => {
    const result = InstallmentOperationsService.validateReschedule({
      installment: snapshot({ status: InstallmentStatus.OVERDUE }),
      newDueDate: new Date('2026-09-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('blocks reschedule to past Tehran date unless policy allows', () => {
    const result = InstallmentOperationsService.validateReschedule({
      installment: snapshot(),
      newDueDate: new Date('2026-06-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.DUE_DATE_IN_PAST,
    });
  });

  it('allows past reschedule when tenant policy permits', () => {
    const result = InstallmentOperationsService.validateReschedule({
      installment: snapshot(),
      newDueDate: new Date('2026-06-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings({ allow_past_reschedule: true }),
      now: NOW,
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe('InstallmentOperationsService — defer', () => {
  it('blocks defer when deferDays exceeds max', () => {
    const result = InstallmentOperationsService.validateDefer({
      installment: snapshot(),
      deferDays: 31,
      policy: DeferPolicy.fromSettings({ defer_max_days: 30 }),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.DEFER_MAX_EXCEEDED,
    });
  });

  it('blocks defer for overdue installment', () => {
    const result = InstallmentOperationsService.validateDefer({
      installment: snapshot({ status: InstallmentStatus.OVERDUE }),
      deferDays: 7,
      policy: DeferPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
    });
  });

  it('blocks defer when deferDays is zero', () => {
    const result = InstallmentOperationsService.validateDefer({
      installment: snapshot(),
      deferDays: 0,
      policy: DeferPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.DEFER_DAYS_INVALID,
    });
  });

  it('defers pending installment within max days', () => {
    const currentDueDate = new Date('2026-08-01T00:00:00.000Z');
    const result = InstallmentOperationsService.validateDefer({
      installment: snapshot({ dueDate: currentDueDate }),
      deferDays: 7,
      policy: DeferPolicy.fromSettings(),
    });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(InstallmentOperationsService.computeDeferredDueDate(currentDueDate, 7)).toEqual(
      addUtcDays(currentDueDate, 7),
    );
  });
});

describe('InstallmentOperationsService — accelerate', () => {
  it('blocks accelerate to a date after current due date', () => {
    const dueDate = new Date('2026-08-01T00:00:00.000Z');
    const result = InstallmentOperationsService.validateAccelerate({
      installment: snapshot({ dueDate }),
      newDueDate: new Date('2026-09-01T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.ACCELERATE_DATE_INVALID,
    });
  });

  it('blocks accelerate to past Tehran date unless policy allows', () => {
    const dueDate = new Date('2026-08-01T00:00:00.000Z');
    const result = InstallmentOperationsService.validateAccelerate({
      installment: snapshot({ dueDate }),
      newDueDate: new Date('2026-06-15T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.DUE_DATE_IN_PAST,
    });
  });

  it('allows accelerate to an earlier date on or before current due date', () => {
    const dueDate = new Date('2026-08-01T00:00:00.000Z');
    const result = InstallmentOperationsService.validateAccelerate({
      installment: snapshot({ dueDate, status: InstallmentStatus.OVERDUE }),
      newDueDate: new Date('2026-07-15T00:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
      now: NOW,
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('resolves overdue to pending when new due date is on or after today', () => {
    const status = InstallmentOperationsService.resolveAccelerateStatus(
      InstallmentStatus.OVERDUE,
      new Date('2026-07-15T00:00:00.000Z'),
      NOW,
    );

    expect(status).toBe(InstallmentStatus.PENDING);
  });

  it('keeps overdue when accelerated due date remains before today', () => {
    const status = InstallmentOperationsService.resolveAccelerateStatus(
      InstallmentStatus.OVERDUE,
      new Date('2026-06-15T00:00:00.000Z'),
      NOW,
    );

    expect(status).toBe(InstallmentStatus.OVERDUE);
  });
});

describe('InstallmentOperationsService — merge', () => {
  it('conserves merged amount', () => {
    const policy = MergeSplitPolicy.fromSettings();
    const installments = [
      snapshot({ id: 'a', sequenceNumber: 1, amountRial: 3_000_000n }),
      snapshot({ id: 'b', sequenceNumber: 2, amountRial: 2_000_000n }),
    ];

    const result = InstallmentOperationsService.validateMerge({
      saleId: SALE_ID,
      installments,
      mergedAmountRial: 5_000_000n,
      policy,
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('rejects merge with fewer than two installments', () => {
    const result = InstallmentOperationsService.validateMerge({
      saleId: SALE_ID,
      installments: [snapshot()],
      mergedAmountRial: 5_000_000n,
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.MERGE_MIN_COUNT,
    });
  });

  it('rejects merge when amounts do not match', () => {
    const result = InstallmentOperationsService.validateMerge({
      saleId: SALE_ID,
      installments: [
        snapshot({ id: 'a', amountRial: 3_000_000n }),
        snapshot({ id: 'b', amountRial: 2_000_000n }),
      ],
      mergedAmountRial: 4_999_000n,
      policy: MergeSplitPolicy.fromSettings({ rounding_unit_rial: '1' }),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.AMOUNT_MISMATCH,
    });
  });
});

describe('InstallmentOperationsService — split', () => {
  it('accepts three-way split that sums to original amount', () => {
    const result = InstallmentOperationsService.validateSplit({
      installment: snapshot({ amountRial: 6_000_000n }),
      partAmountsRial: [2_000_000n, 2_000_000n, 2_000_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('rejects split with zero parts', () => {
    const result = InstallmentOperationsService.validateSplit({
      installment: snapshot(),
      partAmountsRial: [],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.SPLIT_INVALID_PARTS,
    });
  });

  it('rejects split when a part is below minPartRial', () => {
    const result = InstallmentOperationsService.validateSplit({
      installment: snapshot({ amountRial: 5_000_000n }),
      partAmountsRial: [500n, 4_999_500n],
      policy: MergeSplitPolicy.fromSettings({ split_min_part_rial: '1000' }),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.SPLIT_INVALID_PARTS,
    });
  });

  it('rejects split on paid installment', () => {
    const result = InstallmentOperationsService.validateSplit({
      installment: snapshot({ status: InstallmentStatus.PAID }),
      partAmountsRial: [2_500_000n, 2_500_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
    });
  });
});

describe('InstallmentOperationsService — regenerate', () => {
  it('preserves total amount within rounding tolerance', () => {
    const affected = [
      snapshot({ id: 'a', amountRial: 3_333_334n }),
      snapshot({ id: 'b', amountRial: 3_333_333n }),
    ];

    const result = InstallmentOperationsService.validateRegenerate({
      saleId: SALE_ID,
      saleStatus: SaleStatus.ACTIVE,
      affectedInstallments: affected,
      newAmountsRial: [2_000_000n, 4_666_667n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(sumAmountsRial(affected.map((item) => item.amountRial))).toBe(6_666_667n);
  });

  it('blocks regenerate when paid installment is in affected range', () => {
    const result = InstallmentOperationsService.validateRegenerate({
      saleId: SALE_ID,
      saleStatus: SaleStatus.ACTIVE,
      affectedInstallments: [
        snapshot({ status: InstallmentStatus.PAID }),
        snapshot({ id: 'b', sequenceNumber: 2 }),
      ],
      newAmountsRial: [5_000_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.REGENERATE_PAID_BLOCKED,
    });
  });

  it('blocks regenerate when sale is not active', () => {
    const result = InstallmentOperationsService.validateRegenerate({
      saleId: SALE_ID,
      saleStatus: SaleStatus.COMPLETED,
      affectedInstallments: [snapshot()],
      newAmountsRial: [5_000_000n],
      policy: MergeSplitPolicy.fromSettings(),
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.SALE_STATUS_INVALID,
    });
  });
});

describe('InstallmentOperationsService — sequence numbers', () => {
  it('accepts unique sequence numbers after regenerate', () => {
    const result = InstallmentOperationsService.validateUniqueSequenceNumbers({
      sequenceNumbers: [1, 2, 3, 4],
    });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('rejects duplicate sequence numbers', () => {
    const result = InstallmentOperationsService.validateUniqueSequenceNumbers({
      sequenceNumbers: [1, 2, 2, 3],
    });

    expect(result).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.SEQUENCE_NUMBER_DUPLICATE,
    });
  });
});

describe('amount helpers', () => {
  it('assertAmountConservation allows delta within tolerance', () => {
    expect(assertAmountConservation(10_000n, 10_500n, 1_000n)).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('assertAmountConservation fails when delta exceeds tolerance', () => {
    expect(assertAmountConservation(10_000n, 10_500n, 100n)).toEqual({
      ok: false,
      error: InstallmentOperationErrorCode.AMOUNT_MISMATCH,
    });
  });
});
