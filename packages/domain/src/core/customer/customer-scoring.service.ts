import { DomainError } from '../../errors/domain.error.js';

export const DEFAULT_CREDIT_SCORE_MIN = 0;
export const DEFAULT_CREDIT_SCORE_MAX = 1000;
export const MAX_SCORING_PROCESSED_EVENTS = 200;

export type CustomerScoringWeights = {
  paymentConfirmedDelta: number;
  installmentOverdueDelta: number;
  saleCompletedOnTimeDelta: number;
};

export const DEFAULT_CUSTOMER_SCORING_WEIGHTS: CustomerScoringWeights = {
  paymentConfirmedDelta: 5,
  installmentOverdueDelta: -10,
  saleCompletedOnTimeDelta: 2,
};

export type CustomerScoringEventKind =
  | 'payment_confirmed'
  | 'installment_overdue'
  | 'installment_paid'
  | 'sale_completed_on_time'
  | 'installment_waived';

export function clampCreditScore(
  score: number,
  min = DEFAULT_CREDIT_SCORE_MIN,
  max = DEFAULT_CREDIT_SCORE_MAX,
): number {
  return Math.min(max, Math.max(min, score));
}

export function applyScoreDelta(currentScore: number, delta: number): number {
  return clampCreditScore(currentScore + delta);
}

export function scoreDeltaForEvent(
  kind: CustomerScoringEventKind,
  weights: CustomerScoringWeights,
): number {
  switch (kind) {
    case 'payment_confirmed':
      return weights.paymentConfirmedDelta;
    case 'installment_overdue':
      return weights.installmentOverdueDelta;
    case 'sale_completed_on_time':
      return weights.saleCompletedOnTimeDelta;
    case 'installment_waived':
      return 0;
    case 'installment_paid':
      return 0;
  }
}

export function adjustOverdueCount(
  currentCount: number,
  event: 'overdue' | 'paid' | 'waived',
): number {
  switch (event) {
    case 'overdue':
      return currentCount + 1;
    case 'paid':
      return Math.max(0, currentCount - 1);
    case 'waived':
      return currentCount;
  }
}

export function resolveManualScoreAdjustment(
  currentScore: number,
  params: { delta?: number; newScore?: number },
): number {
  if (params.newScore !== undefined) {
    return clampCreditScore(params.newScore);
  }

  if (params.delta !== undefined) {
    return applyScoreDelta(currentScore, params.delta);
  }

  throw new DomainError('INVALID_SCORE_ADJUSTMENT');
}

export function shouldAutoBlacklist(
  creditScore: number,
  threshold: number | null | undefined,
): boolean {
  if (threshold === null || threshold === undefined) {
    return false;
  }

  return creditScore < threshold;
}

export function buildAutoBlacklistReason(creditScore: number, threshold: number): string {
  return `Auto-blacklisted: score ${creditScore} below threshold ${threshold}`;
}

export function hasScoringEventProcessed(
  metadata: Record<string, unknown> | null,
  eventId: string,
): boolean {
  if (!metadata || !Array.isArray(metadata.scoringProcessedEventIds)) {
    return false;
  }

  return (metadata.scoringProcessedEventIds as string[]).includes(eventId);
}

export function markScoringEventProcessed(
  metadata: Record<string, unknown> | null,
  eventId: string,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {};

  const existing = Array.isArray(base.scoringProcessedEventIds)
    ? [...(base.scoringProcessedEventIds as string[])]
    : [];

  if (!existing.includes(eventId)) {
    existing.push(eventId);
  }

  base.scoringProcessedEventIds =
    existing.length > MAX_SCORING_PROCESSED_EVENTS
      ? existing.slice(existing.length - MAX_SCORING_PROCESSED_EVENTS)
      : existing;

  return base;
}

export function parseCustomerScoringWeights(
  settings: Record<string, unknown>,
): CustomerScoringWeights {
  return {
    paymentConfirmedDelta: readIntSetting(
      settings.customer_scoring_payment_confirmed_delta,
      DEFAULT_CUSTOMER_SCORING_WEIGHTS.paymentConfirmedDelta,
    ),
    installmentOverdueDelta: readIntSetting(
      settings.customer_scoring_installment_overdue_delta,
      DEFAULT_CUSTOMER_SCORING_WEIGHTS.installmentOverdueDelta,
    ),
    saleCompletedOnTimeDelta: readIntSetting(
      settings.customer_scoring_sale_completed_on_time_delta,
      DEFAULT_CUSTOMER_SCORING_WEIGHTS.saleCompletedOnTimeDelta,
    ),
  };
}

export function parseAutoBlacklistThreshold(
  settings: Record<string, unknown>,
): number | null {
  const raw = settings.customer_auto_blacklist_score_threshold;
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return null;
  }

  return clampCreditScore(raw);
}

function readIntSetting(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return fallback;
  }

  return value;
}
