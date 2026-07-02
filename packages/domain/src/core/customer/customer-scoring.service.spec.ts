import { describe, expect, it } from 'vitest';

import {
  adjustOverdueCount,
  applyScoreDelta,
  buildAutoBlacklistReason,
  clampCreditScore,
  hasScoringEventProcessed,
  markScoringEventProcessed,
  resolveManualScoreAdjustment,
  scoreDeltaForEvent,
  shouldAutoBlacklist,
  DEFAULT_CUSTOMER_SCORING_WEIGHTS,
} from './customer-scoring.service.js';

describe('clampCreditScore', () => {
  it('clamps score to 0–1000', () => {
    expect(clampCreditScore(-50)).toBe(0);
    expect(clampCreditScore(1500)).toBe(1000);
    expect(clampCreditScore(500)).toBe(500);
  });
});

describe('applyScoreDelta', () => {
  it('applies delta with clamping', () => {
    expect(applyScoreDelta(995, 10)).toBe(1000);
    expect(applyScoreDelta(3, -10)).toBe(0);
  });
});

describe('adjustOverdueCount', () => {
  it('increments on overdue and decrements on paid without going negative', () => {
    expect(adjustOverdueCount(2, 'overdue')).toBe(3);
    expect(adjustOverdueCount(2, 'paid')).toBe(1);
    expect(adjustOverdueCount(0, 'paid')).toBe(0);
    expect(adjustOverdueCount(4, 'waived')).toBe(4);
  });
});

describe('scoreDeltaForEvent', () => {
  it('returns configured weights and zero for waive', () => {
    expect(scoreDeltaForEvent('payment_confirmed', DEFAULT_CUSTOMER_SCORING_WEIGHTS)).toBe(5);
    expect(scoreDeltaForEvent('installment_overdue', DEFAULT_CUSTOMER_SCORING_WEIGHTS)).toBe(-10);
    expect(scoreDeltaForEvent('installment_waived', DEFAULT_CUSTOMER_SCORING_WEIGHTS)).toBe(0);
  });
});

describe('resolveManualScoreAdjustment', () => {
  it('supports delta and absolute new score', () => {
    expect(resolveManualScoreAdjustment(100, { delta: 15 })).toBe(115);
    expect(resolveManualScoreAdjustment(100, { newScore: 250 })).toBe(250);
  });

  it('requires delta or newScore', () => {
    expect(() => resolveManualScoreAdjustment(100, {})).toThrow(
      expect.objectContaining({ code: 'INVALID_SCORE_ADJUSTMENT' }),
    );
  });
});

describe('shouldAutoBlacklist', () => {
  it('returns false when threshold disabled', () => {
    expect(shouldAutoBlacklist(10, null)).toBe(false);
    expect(shouldAutoBlacklist(10, undefined)).toBe(false);
  });

  it('returns true when score below threshold', () => {
    expect(shouldAutoBlacklist(49, 50)).toBe(true);
    expect(shouldAutoBlacklist(50, 50)).toBe(false);
  });
});

describe('scoring event idempotency metadata', () => {
  it('tracks processed outbox event ids', () => {
    const first = markScoringEventProcessed(null, 'event-1');
    expect(hasScoringEventProcessed(first, 'event-1')).toBe(true);
    expect(hasScoringEventProcessed(first, 'event-2')).toBe(false);

    const second = markScoringEventProcessed(first, 'event-2');
    expect(second.scoringProcessedEventIds).toEqual(['event-1', 'event-2']);
  });
});

describe('buildAutoBlacklistReason', () => {
  it('includes score and threshold', () => {
    expect(buildAutoBlacklistReason(20, 50)).toContain('20');
    expect(buildAutoBlacklistReason(20, 50)).toContain('50');
  });
});
