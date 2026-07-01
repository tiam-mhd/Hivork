import { describe, expect, it } from 'vitest';

import {
  calculateInstallmentSchedule,
  sumInstallmentScheduleAmounts,
} from '../calculate-installment-schedule.js';

const MS_PER_DAY = 86_400_000;

function scheduleInput(
  overrides: Partial<Parameters<typeof calculateInstallmentSchedule>[0]> = {},
) {
  return {
    totalAmountRial: 10_000_000n,
    downPaymentRial: 0n,
    installmentCount: 3,
    firstDueDate: new Date('2025-01-01T00:00:00.000Z'),
    intervalDays: 30,
    ...overrides,
  };
}

describe('calculateInstallmentSchedule (BR-005)', () => {
  it('BR-005: 10M / 3 — remainder to first installments', () => {
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: 10_000_000n,
        downPaymentRial: 0n,
        installmentCount: 3,
      }),
    );

    expect(result).toHaveLength(3);
    expect(result[0]!.amountRial).toBe(3_333_334n);
    expect(result[1]!.amountRial).toBe(3_333_333n);
    expect(result[2]!.amountRial).toBe(3_333_333n);
    expect(sumInstallmentScheduleAmounts(result) + 0n).toBe(10_000_000n);
  });

  it('BR-005: 12M total, 2M down, 4 installments — even split', () => {
    const downPaymentRial = 2_000_000n;
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: 12_000_000n,
        downPaymentRial,
        installmentCount: 4,
        firstDueDate: new Date('2025-02-01T00:00:00.000Z'),
      }),
    );

    expect(result.every((item) => item.amountRial === 2_500_000n)).toBe(true);
    expect(sumInstallmentScheduleAmounts(result) + downPaymentRial).toBe(12_000_000n);
  });

  it('BR-005: remainder=2 distributed to first two installments', () => {
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: 10_000_001n,
        downPaymentRial: 0n,
        installmentCount: 3,
      }),
    );

    expect(result[0]!.amountRial).toBe(3_333_334n);
    expect(result[1]!.amountRial).toBe(3_333_334n);
    expect(result[2]!.amountRial).toBe(3_333_333n);
    expect(sumInstallmentScheduleAmounts(result)).toBe(10_000_001n);
  });

  it('downPayment === total → single zero installment (BR-004)', () => {
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: 5_000_000n,
        downPaymentRial: 5_000_000n,
        installmentCount: 6,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.amountRial).toBe(0n);
  });

  it('count=1 → entire remaining in single installment', () => {
    const downPaymentRial = 1_000_000n;
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: 7_777_777n,
        downPaymentRial,
        installmentCount: 1,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.amountRial).toBe(6_777_777n);
    expect(sumInstallmentScheduleAmounts(result) + downPaymentRial).toBe(7_777_777n);
  });

  it('count=120 — sum invariant holds at max count', () => {
    const total = 120_000_000n;
    const down = 0n;
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: total,
        downPaymentRial: down,
        installmentCount: 120,
      }),
    );

    expect(result).toHaveLength(120);
    expect(sumInstallmentScheduleAmounts(result) + down).toBe(total);
  });

  it('sum(installments) + downPayment === total for varied counts', () => {
    const total = 99_999_999n;
    const down = 11_111_111n;

    for (const installmentCount of [1, 2, 3, 5, 7, 12, 24, 60, 120]) {
      const result = calculateInstallmentSchedule(
        scheduleInput({
          totalAmountRial: total,
          downPaymentRial: down,
          installmentCount,
        }),
      );

      expect(result).toHaveLength(installmentCount);
      expect(sumInstallmentScheduleAmounts(result) + down).toBe(total);
    }
  });

  it('due dates increment by intervalDays', () => {
    const result = calculateInstallmentSchedule(
      scheduleInput({
        totalAmountRial: 3_000_000n,
        downPaymentRial: 0n,
        installmentCount: 3,
        firstDueDate: new Date('2025-01-15T00:00:00.000Z'),
        intervalDays: 30,
      }),
    );

    expect(result[0]!.sequenceNumber).toBe(1);
    expect(result[1]!.dueDate.getTime() - result[0]!.dueDate.getTime()).toBe(30 * MS_PER_DAY);
    expect(result[2]!.dueDate.getTime() - result[1]!.dueDate.getTime()).toBe(30 * MS_PER_DAY);
  });

  it('sequence numbers are 1-based and contiguous', () => {
    const result = calculateInstallmentSchedule(scheduleInput({ installmentCount: 5 }));

    expect(result.map((item) => item.sequenceNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('calculateInstallmentSchedule errors', () => {
  it('downPayment > total → AMOUNT_EXCEEDS_TOTAL', () => {
    expect(() =>
      calculateInstallmentSchedule(
        scheduleInput({
          totalAmountRial: 5_000_000n,
          downPaymentRial: 6_000_000n,
          installmentCount: 4,
        }),
      ),
    ).toThrow('AMOUNT_EXCEEDS_TOTAL');
  });

  it('count=0 → INSTALLMENT_COUNT_INVALID', () => {
    expect(() =>
      calculateInstallmentSchedule(scheduleInput({ installmentCount: 0 })),
    ).toThrow('INSTALLMENT_COUNT_INVALID');
  });

  it('count=121 → INSTALLMENT_COUNT_INVALID', () => {
    expect(() =>
      calculateInstallmentSchedule(scheduleInput({ installmentCount: 121 })),
    ).toThrow('INSTALLMENT_COUNT_INVALID');
  });

  it('interval=0 → INTERVAL_INVALID', () => {
    expect(() =>
      calculateInstallmentSchedule(scheduleInput({ intervalDays: 0 })),
    ).toThrow('INTERVAL_INVALID');
  });
});
