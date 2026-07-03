import { tehranDateKey } from './date.utils.js';

export type PenaltyType = 'none' | 'fixed_daily' | 'percent_daily' | 'percent_monthly';

export type PenaltyCalculationSettings = {
  penalty_type: PenaltyType;
  penalty_rate_bps: number;
  penalty_fixed_rial: bigint;
  penalty_grace_days: number;
  penalty_max_rial: bigint;
};

export type PenaltyPreviewResult = {
  overdueDays: number;
  graceDays: number;
  chargeableDays: number;
  calculatedPenaltyRial: bigint;
  cappedByMax: boolean;
};

const DAY_MS = 86_400_000;

function calendarDayDiffTehran(later: Date, earlier: Date): number {
  const laterUtc = Date.parse(`${tehranDateKey(later)}T00:00:00Z`);
  const earlierUtc = Date.parse(`${tehranDateKey(earlier)}T00:00:00Z`);

  return Math.max(0, Math.round((laterUtc - earlierUtc) / DAY_MS));
}

export function computeOverdueDays(dueDate: Date, now: Date = new Date()): number {
  return calendarDayDiffTehran(now, dueDate);
}

function applyMaxCap(
  rawPenalty: bigint,
  existingPenaltyTotalRial: bigint,
  maxRial: bigint,
): { amount: bigint; cappedByMax: boolean } {
  if (maxRial <= 0n) {
    return { amount: rawPenalty, cappedByMax: false };
  }

  const remainingCap = maxRial > existingPenaltyTotalRial ? maxRial - existingPenaltyTotalRial : 0n;
  if (rawPenalty <= remainingCap) {
    return { amount: rawPenalty, cappedByMax: false };
  }

  return { amount: remainingCap, cappedByMax: rawPenalty > remainingCap };
}

export function calculatePenaltyPreview(input: {
  installmentAmountRial: bigint;
  dueDate: Date;
  settings: PenaltyCalculationSettings;
  existingPenaltyTotalRial?: bigint;
  now?: Date;
}): PenaltyPreviewResult {
  const now = input.now ?? new Date();
  const existingPenaltyTotalRial = input.existingPenaltyTotalRial ?? 0n;
  const graceDays = input.settings.penalty_grace_days;
  const overdueDays = computeOverdueDays(input.dueDate, now);
  const chargeableDays = Math.max(0, overdueDays - graceDays);

  if (chargeableDays === 0 || input.settings.penalty_type === 'none') {
    return {
      overdueDays,
      graceDays,
      chargeableDays,
      calculatedPenaltyRial: 0n,
      cappedByMax: false,
    };
  }

  let rawPenalty = 0n;
  const chargeableDaysBig = BigInt(chargeableDays);

  switch (input.settings.penalty_type) {
    case 'fixed_daily':
      rawPenalty = input.settings.penalty_fixed_rial * chargeableDaysBig;
      break;
    case 'percent_daily': {
      const dailyRate = (input.installmentAmountRial * BigInt(input.settings.penalty_rate_bps)) / 10_000n;
      rawPenalty = dailyRate * chargeableDaysBig;
      break;
    }
    case 'percent_monthly': {
      const monthlyRate = (input.installmentAmountRial * BigInt(input.settings.penalty_rate_bps)) / 10_000n;
      rawPenalty = (monthlyRate * chargeableDaysBig) / 30n;
      break;
    }
    default:
      rawPenalty = 0n;
  }

  const capped = applyMaxCap(rawPenalty, existingPenaltyTotalRial, input.settings.penalty_max_rial);

  return {
    overdueDays,
    graceDays,
    chargeableDays,
    calculatedPenaltyRial: capped.amount,
    cappedByMax: capped.cappedByMax,
  };
}

export function assertPenaltyWithinMax(input: {
  penaltyAmountRial: bigint;
  existingPenaltyTotalRial: bigint;
  maxRial: bigint;
}): void {
  if (input.maxRial <= 0n) {
    return;
  }

  if (input.penaltyAmountRial <= 0n) {
    return;
  }

  const total = input.existingPenaltyTotalRial + input.penaltyAmountRial;
  if (total > input.maxRial) {
    throw new Error('PENALTY_MAX_EXCEEDED');
  }
}

export function isSameTehranDay(a: Date, b: Date): boolean {
  return tehranDateKey(a) === tehranDateKey(b);
}
