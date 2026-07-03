import { describe, expect, it } from 'vitest';

import {
  generateRegeneratedInstallmentSchedule,
  sumRegeneratedScheduleAmounts,
} from './installment-schedule.generator.js';

describe('generateRegeneratedInstallmentSchedule (IFP-083)', () => {
  it('splits 6 ways and preserves total bigint', () => {
    const total = 60_000_000n;
    const schedule = generateRegeneratedInstallmentSchedule({
      totalAmountRial: total,
      installmentCount: 6,
      startSequenceNumber: 3,
      roundingPolicy: 'last_installment_absorbs_remainder',
      firstDueDate: new Date('2026-09-01T12:00:00.000Z'),
      intervalDays: 30,
    });

    expect(schedule).toHaveLength(6);
    expect(sumRegeneratedScheduleAmounts(schedule)).toBe(total);
    expect(schedule.map((item) => item.sequenceNumber)).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('puts remainder on the last installment', () => {
    const total = 10_000_003n;
    const schedule = generateRegeneratedInstallmentSchedule({
      totalAmountRial: total,
      installmentCount: 3,
      startSequenceNumber: 1,
      roundingPolicy: 'last_installment_absorbs_remainder',
      firstDueDate: new Date('2026-09-01T12:00:00.000Z'),
      intervalDays: 30,
    });

    expect(schedule[0]?.amountRial).toBe(3_333_334n);
    expect(schedule[1]?.amountRial).toBe(3_333_334n);
    expect(schedule[2]?.amountRial).toBe(3_333_335n);
    expect(sumRegeneratedScheduleAmounts(schedule)).toBe(total);
  });

  it('uses custom due dates when provided', () => {
    const schedule = generateRegeneratedInstallmentSchedule({
      totalAmountRial: 3_000_000n,
      installmentCount: 2,
      startSequenceNumber: 4,
      roundingPolicy: 'last_installment_absorbs_remainder',
      customDueDates: [
        new Date('2026-10-01T12:00:00.000Z'),
        new Date('2026-11-15T12:00:00.000Z'),
      ],
    });

    expect(schedule[0]?.dueDate.toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(schedule[1]?.dueDate.toISOString()).toBe('2026-11-15T12:00:00.000Z');
  });
});
