import { DomainError } from '../errors/domain.error.js';
import { computeLineTotal } from './sale-line-item.entity.js';
import { InstallmentStatus, type InstallmentSnapshot } from './installment.types.js';
import { Sale } from './sale.entity.js';
import { SaleDomainErrorCode } from './errors.js';
import { SaleStatus } from './sale.types.js';

export type DomainResult<T = void, E extends string = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T = void>(value: T): DomainResult<T, never> {
  return { ok: true, value };
}

export function fail<E extends string>(error: E): DomainResult<never, E> {
  return { ok: false, error };
}

export type LineItemTotalInput = {
  quantity: number;
  unitPriceRial: bigint;
  discountRial: bigint;
  taxRial: bigint;
};

export type ValidateFinancialInvariantInput = {
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  installmentAmounts: bigint[];
};

export type EvaluateScheduleRegenerationInput = ValidateFinancialInvariantInput & {
  /** When provided, regeneration is flagged only if total changed and invariant fails. */
  previousTotalAmountRial?: bigint;
};

export type ScheduleRegenerationEvaluation = {
  requiresScheduleRegeneration: boolean;
  invariant: DomainResult<void, 'INSTALLMENT_SUM_MISMATCH'>;
};

/**
 * BR-005 line total: quantity × unitPrice − discount + tax (bigint exact).
 * @throws `LINE_TOTAL_NEGATIVE`, `DISCOUNT_EXCEEDS_LINE_TOTAL`, `AMOUNT_INVALID`, `QUANTITY_INVALID`
 */
export function calculateLineTotal(item: LineItemTotalInput): bigint {
  const lineTotal = computeLineTotal({
    quantity: item.quantity,
    unitPriceRial: item.unitPriceRial,
    discountRial: item.discountRial,
    taxRial: item.taxRial,
  });

  if (lineTotal < 0n) {
    throw new DomainError('LINE_TOTAL_NEGATIVE');
  }

  return lineTotal;
}

/** Sum of all line totals (merchandise subtotal including per-line tax). */
export function calculateSaleSubtotal(items: LineItemTotalInput[]): bigint {
  return items.reduce((acc, item) => acc + calculateLineTotal(item), 0n);
}

/** BR-005 — downPayment + Σ installments must equal totalAmountRial. */
export function validateInstallmentSum(
  input: ValidateFinancialInvariantInput,
): DomainResult<void, 'INSTALLMENT_SUM_MISMATCH'> {
  return validateFinancialInvariant(input);
}

export function validateFinancialInvariant(
  input: ValidateFinancialInvariantInput,
): DomainResult<void, 'INSTALLMENT_SUM_MISMATCH'> {
  const installmentSum = input.installmentAmounts.reduce((acc, amount) => acc + amount, 0n);
  const sum = input.downPaymentRial + installmentSum;

  if (sum !== input.totalAmountRial) {
    return fail('INSTALLMENT_SUM_MISMATCH');
  }

  return ok(undefined);
}

/** BR-002 — down payment must not exceed contract total. */
export function assertDownPaymentWithinTotal(
  totalAmountRial: bigint,
  downPaymentRial: bigint,
): void {
  if (downPaymentRial > totalAmountRial) {
    throw new DomainError(SaleDomainErrorCode.AMOUNT_EXCEEDS_TOTAL);
  }
}

/**
 * After line-item / header financial edits, detect whether installment schedule
 * must be regenerated to satisfy BR-005 with the new total.
 */
export function evaluateScheduleRegeneration(
  input: EvaluateScheduleRegenerationInput,
): ScheduleRegenerationEvaluation {
  const invariant = validateFinancialInvariant(input);

  if (invariant.ok) {
    return { requiresScheduleRegeneration: false, invariant };
  }

  const totalChanged =
    input.previousTotalAmountRial === undefined ||
    input.previousTotalAmountRial !== input.totalAmountRial;

  return {
    requiresScheduleRegeneration: totalChanged,
    invariant,
  };
}

/** Active sale with no paid installments — required before financial edits (IFP-070). */
export function assertCanModifyFinancials(
  sale: Sale,
  installments: InstallmentSnapshot[],
): void {
  if (sale.canEditFinancials(installments)) {
    return;
  }

  if (installments.some((installment) => installment.status === InstallmentStatus.PAID)) {
    throw new DomainError(SaleDomainErrorCode.SALE_HAS_PAID_INSTALLMENT);
  }

  if (sale.status === SaleStatus.CANCELLED) {
    throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED);
  }

  if (sale.status === SaleStatus.COMPLETED) {
    throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_COMPLETED);
  }

  throw new DomainError(SaleDomainErrorCode.SALE_ARCHIVED_READONLY);
}

/** Namespace alias matching task spec (`SaleTotalsCalculator`). */
export const SaleTotalsCalculator = {
  calculateLineTotal,
  calculateSaleSubtotal,
  validateInstallmentSum,
  validateFinancialInvariant,
  assertDownPaymentWithinTotal,
  evaluateScheduleRegeneration,
  assertCanModifyFinancials,
};
