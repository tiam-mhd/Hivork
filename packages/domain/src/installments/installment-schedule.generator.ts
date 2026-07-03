import { DomainError } from '../errors/domain.error.js';
import { addUtcDays } from './date.utils.js';
import { SaleDomainErrorCode } from './errors.js';
import type { InstallmentScheduleItem } from './calculate-installment-schedule.js';

export const REGENERATE_ROUNDING_POLICIES = ['last_installment_absorbs_remainder'] as const;

export type RegenerateRoundingPolicy = (typeof REGENERATE_ROUNDING_POLICIES)[number];

export type GenerateRegeneratedScheduleInput = {
  totalAmountRial: bigint;
  installmentCount: number;
  startSequenceNumber: number;
  roundingPolicy: RegenerateRoundingPolicy;
  firstDueDate?: Date;
  intervalDays?: number;
  customDueDates?: Date[];
};

const MIN_INSTALLMENT_COUNT = 1;
const MAX_INSTALLMENT_COUNT = 120;
const MIN_INTERVAL_DAYS = 1;

function resolveDueDates(input: GenerateRegeneratedScheduleInput): Date[] {
  if (input.customDueDates?.length) {
    if (input.customDueDates.length !== input.installmentCount) {
      throw new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID);
    }
    return [...input.customDueDates];
  }

  if (!input.firstDueDate || input.intervalDays === undefined) {
    throw new DomainError(SaleDomainErrorCode.INTERVAL_INVALID);
  }

  if (!Number.isInteger(input.intervalDays) || input.intervalDays < MIN_INTERVAL_DAYS) {
    throw new DomainError(SaleDomainErrorCode.INTERVAL_INVALID);
  }

  return Array.from({ length: input.installmentCount }, (_, index) =>
    addUtcDays(input.firstDueDate!, index * input.intervalDays!),
  );
}

function splitAmountWithLastRemainder(totalAmountRial: bigint, installmentCount: number): bigint[] {
  const count = BigInt(installmentCount);
  const base = totalAmountRial / count;
  const remainder = totalAmountRial % count;

  return Array.from({ length: installmentCount }, (_, index) =>
    index === installmentCount - 1 ? base + remainder : base,
  );
}

/**
 * Distributes a remaining installment total across a new schedule (IFP-083).
 * Remainder rial is absorbed by the last installment.
 */
export function generateRegeneratedInstallmentSchedule(
  input: GenerateRegeneratedScheduleInput,
): InstallmentScheduleItem[] {
  if (
    !Number.isInteger(input.installmentCount) ||
    input.installmentCount < MIN_INSTALLMENT_COUNT ||
    input.installmentCount > MAX_INSTALLMENT_COUNT
  ) {
    throw new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID);
  }

  if (input.roundingPolicy !== 'last_installment_absorbs_remainder') {
    throw new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID);
  }

  if (input.totalAmountRial < 0n) {
    throw new DomainError(SaleDomainErrorCode.AMOUNT_MUST_BE_POSITIVE);
  }

  const dueDates = resolveDueDates(input);
  const amounts = splitAmountWithLastRemainder(input.totalAmountRial, input.installmentCount);

  return dueDates.map((dueDate, index) => ({
    sequenceNumber: input.startSequenceNumber + index,
    dueDate,
    amountRial: amounts[index]!,
  }));
}

export function sumRegeneratedScheduleAmounts(items: InstallmentScheduleItem[]): bigint {
  return items.reduce((total, item) => total + item.amountRial, 0n);
}
