import { DomainError } from '../errors/domain.error.js';
import { addUtcDays } from './date.utils.js';
import { SaleDomainErrorCode } from './errors.js';

export type InstallmentScheduleItem = {
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
};

export type CalculateInstallmentScheduleInput = {
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  installmentCount: number;
  firstDueDate: Date;
  intervalDays: number;
};

const MIN_INSTALLMENT_COUNT = 1;
const MAX_INSTALLMENT_COUNT = 120;
const MIN_INTERVAL_DAYS = 1;

function validateScheduleInput(input: CalculateInstallmentScheduleInput): void {
  if (input.downPaymentRial > input.totalAmountRial) {
    throw new DomainError(SaleDomainErrorCode.AMOUNT_EXCEEDS_TOTAL);
  }

  if (
    !Number.isInteger(input.installmentCount) ||
    input.installmentCount < MIN_INSTALLMENT_COUNT ||
    input.installmentCount > MAX_INSTALLMENT_COUNT
  ) {
    throw new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID);
  }

  if (!Number.isInteger(input.intervalDays) || input.intervalDays < MIN_INTERVAL_DAYS) {
    throw new DomainError(SaleDomainErrorCode.INTERVAL_INVALID);
  }
}

/**
 * BR-005 — distribute remaining amount across installments.
 * First `remainder` installments receive `base + 1` rial; rest receive `base`.
 * BR-004 — when remaining is zero, returns a single zero-amount installment.
 */
export function calculateInstallmentSchedule(
  input: CalculateInstallmentScheduleInput,
): InstallmentScheduleItem[] {
  validateScheduleInput(input);

  const remaining = input.totalAmountRial - input.downPaymentRial;

  // BR-004: full prepayment → one zero installment regardless of requested count
  const installmentCount = remaining === 0n ? 1 : input.installmentCount;
  const count = BigInt(installmentCount);
  const base = remaining / count;
  const remainder = remaining % count;

  const items: InstallmentScheduleItem[] = [];
  for (let index = 0; index < installmentCount; index += 1) {
    const amountRial = base + (BigInt(index) < remainder ? 1n : 0n);
    const dueDate = addUtcDays(input.firstDueDate, index * input.intervalDays);
    items.push({
      sequenceNumber: index + 1,
      dueDate,
      amountRial,
    });
  }

  return items;
}

export function sumInstallmentScheduleAmounts(items: InstallmentScheduleItem[]): bigint {
  return items.reduce((acc, item) => acc + item.amountRial, 0n);
}
