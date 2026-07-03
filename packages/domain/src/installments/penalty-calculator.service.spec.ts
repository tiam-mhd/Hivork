import { describe, expect, it } from 'vitest';

import {
  calculatePenaltyPreview,
  assertPenaltyWithinMax,
  computeOverdueDays,
} from './penalty-calculator.service.js';

describe('penalty-calculator.service', () => {
  const baseSettings = {
    penalty_type: 'fixed_daily' as const,
    penalty_rate_bps: 0,
    penalty_fixed_rial: 50_000n,
    penalty_grace_days: 2,
    penalty_max_rial: 0n,
  };

  it('applies grace days before charging', () => {
    const dueDate = new Date('2026-07-01T12:00:00.000Z');
    const now = new Date('2026-07-06T12:00:00.000Z');

    const preview = calculatePenaltyPreview({
      installmentAmountRial: 10_000_000n,
      dueDate,
      settings: baseSettings,
      now,
    });

    expect(preview.overdueDays).toBe(computeOverdueDays(dueDate, now));
    expect(preview.graceDays).toBe(2);
    expect(preview.chargeableDays).toBe(Math.max(0, preview.overdueDays - 2));
    expect(preview.calculatedPenaltyRial).toBe(BigInt(preview.chargeableDays) * 50_000n);
  });

  it('caps penalty by maxRial', () => {
    const dueDate = new Date('2026-07-01T12:00:00.000Z');
    const now = new Date('2026-07-11T12:00:00.000Z');

    const preview = calculatePenaltyPreview({
      installmentAmountRial: 10_000_000n,
      dueDate,
      settings: {
        ...baseSettings,
        penalty_max_rial: 150_000n,
      },
      now,
    });

    expect(preview.calculatedPenaltyRial).toBe(150_000n);
    expect(preview.cappedByMax).toBe(true);
  });

  it('calculates percent_daily penalty', () => {
    const preview = calculatePenaltyPreview({
      installmentAmountRial: 10_000_000n,
      dueDate: new Date('2026-07-01T12:00:00.000Z'),
      settings: {
        penalty_type: 'percent_daily',
        penalty_rate_bps: 50,
        penalty_fixed_rial: 0n,
        penalty_grace_days: 0,
        penalty_max_rial: 0n,
      },
      now: new Date('2026-07-04T12:00:00.000Z'),
    });

    expect(preview.chargeableDays).toBe(3);
    expect(preview.calculatedPenaltyRial).toBe(150_000n);
  });

  it('assertPenaltyWithinMax throws when exceeded', () => {
    expect(() =>
      assertPenaltyWithinMax({
        penaltyAmountRial: 200_000n,
        existingPenaltyTotalRial: 100_000n,
        maxRial: 250_000n,
      }),
    ).toThrow('PENALTY_MAX_EXCEEDED');
  });
});
