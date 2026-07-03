import { addUtcDays, compareTehranDates } from './date.utils.js';
import {
  InstallmentOperationErrorCode,
  InstallmentOperationNotAllowedError,
} from './errors/installment-operation.errors.js';
import { InstallmentStatus, type InstallmentOperationSnapshot } from './installment.types.js';
import { fail, ok, type DomainResult } from './sale-totals.calculator.js';
import { SaleStatus } from './sale.types.js';
import { DeferPolicy } from './value-objects/defer-policy.vo.js';
import { MergeSplitPolicy } from './value-objects/merge-split-policy.vo.js';
import { ReschedulePolicy } from './value-objects/reschedule-policy.vo.js';

const OPERABLE_STATUSES = new Set<InstallmentStatus>([
  InstallmentStatus.PENDING,
  InstallmentStatus.OVERDUE,
]);

const DEFERRABLE_STATUSES = new Set<InstallmentStatus>([InstallmentStatus.PENDING]);

export type ValidateRescheduleInput = {
  installment: InstallmentOperationSnapshot;
  newDueDate: Date;
  policy: ReschedulePolicy;
  now?: Date;
};

export type ValidateDeferInput = {
  installment: InstallmentOperationSnapshot;
  deferDays: number;
  policy: DeferPolicy;
};

export type ValidateAccelerateInput = {
  installment: InstallmentOperationSnapshot;
  newDueDate: Date;
  policy: ReschedulePolicy;
  now?: Date;
};

export type ValidateRegenerateInput = {
  saleId: string;
  saleStatus: SaleStatus;
  affectedInstallments: InstallmentOperationSnapshot[];
  newAmountsRial: bigint[];
  policy: MergeSplitPolicy;
};

export type ValidateMergeInput = {
  saleId: string;
  installments: InstallmentOperationSnapshot[];
  mergedAmountRial: bigint;
  policy: MergeSplitPolicy;
};

export type ValidateSplitInput = {
  installment: InstallmentOperationSnapshot;
  partAmountsRial: bigint[];
  policy: MergeSplitPolicy;
};

export type ValidateSequenceNumbersInput = {
  sequenceNumbers: number[];
};

/**
 * Pure domain validation for advanced installment operations (IFP-079).
 * Persistence, audit, and optimistic locking live in application use cases.
 */
export class InstallmentOperationsService {
  static assertOperable(installment: InstallmentOperationSnapshot): void {
    if (installment.status === InstallmentStatus.PAID) {
      throw new InstallmentOperationNotAllowedError(
        InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
      );
    }
    if (installment.status === InstallmentStatus.WAIVED) {
      throw new InstallmentOperationNotAllowedError(
        InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED,
      );
    }
    if (!OPERABLE_STATUSES.has(installment.status)) {
      throw new InstallmentOperationNotAllowedError(
        InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
      );
    }
  }

  static validateReschedule(input: ValidateRescheduleInput): DomainResult<void> {
    try {
      InstallmentOperationsService.assertOperable(input.installment);
    } catch (error) {
      if (error instanceof InstallmentOperationNotAllowedError) {
        return fail(error.code);
      }
      throw error;
    }

    const now = input.now ?? new Date();
    if (
      !input.policy.allowPastDueDate &&
      compareTehranDates(input.newDueDate, now) < 0
    ) {
      return fail(InstallmentOperationErrorCode.DUE_DATE_IN_PAST);
    }

    return ok(undefined);
  }

  static validateDefer(input: ValidateDeferInput): DomainResult<void> {
    if (!DEFERRABLE_STATUSES.has(input.installment.status)) {
      if (input.installment.status === InstallmentStatus.WAIVED) {
        return fail(InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED);
      }
      return fail(InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID);
    }

    if (!Number.isInteger(input.deferDays) || input.deferDays <= 0) {
      return fail(InstallmentOperationErrorCode.DEFER_DAYS_INVALID);
    }

    if (input.deferDays > input.policy.maxDeferDays) {
      return fail(InstallmentOperationErrorCode.DEFER_MAX_EXCEEDED);
    }

    return ok(undefined);
  }

  static computeDeferredDueDate(currentDueDate: Date, deferDays: number): Date {
    return addUtcDays(currentDueDate, deferDays);
  }

  static validateAccelerate(input: ValidateAccelerateInput): DomainResult<void> {
    try {
      InstallmentOperationsService.assertOperable(input.installment);
    } catch (error) {
      if (error instanceof InstallmentOperationNotAllowedError) {
        return fail(error.code);
      }
      throw error;
    }

    if (compareTehranDates(input.newDueDate, input.installment.dueDate) > 0) {
      return fail(InstallmentOperationErrorCode.ACCELERATE_DATE_INVALID);
    }

    const now = input.now ?? new Date();
    if (
      !input.policy.allowPastDueDate &&
      compareTehranDates(input.newDueDate, now) < 0
    ) {
      return fail(InstallmentOperationErrorCode.DUE_DATE_IN_PAST);
    }

    return ok(undefined);
  }

  /** Overdue installments may return to pending when accelerated to today or later (IFP-082). */
  static resolveAccelerateStatus(
    currentStatus: InstallmentStatus,
    newDueDate: Date,
    now?: Date,
  ): InstallmentStatus {
    if (currentStatus !== InstallmentStatus.OVERDUE) {
      return currentStatus;
    }

    const reference = now ?? new Date();
    if (compareTehranDates(newDueDate, reference) >= 0) {
      return InstallmentStatus.PENDING;
    }

    return InstallmentStatus.OVERDUE;
  }

  static validateRegenerate(input: ValidateRegenerateInput): DomainResult<void> {
    if (input.saleStatus !== SaleStatus.ACTIVE) {
      return fail(InstallmentOperationErrorCode.SALE_STATUS_INVALID);
    }

    if (input.affectedInstallments.length === 0) {
      return fail(InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID);
    }

    for (const installment of input.affectedInstallments) {
      if (installment.saleId !== input.saleId) {
        return fail(InstallmentOperationErrorCode.INSTALLMENTS_SALE_MISMATCH);
      }
      if (
        installment.status === InstallmentStatus.PAID ||
        installment.status === InstallmentStatus.WAIVED
      ) {
        return fail(InstallmentOperationErrorCode.REGENERATE_PAID_BLOCKED);
      }
      if (!OPERABLE_STATUSES.has(installment.status)) {
        return fail(InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID);
      }
    }

    const expectedTotal = sumAmountsRial(
      input.affectedInstallments.map((item) => item.amountRial),
    );
    const actualTotal = sumAmountsRial(input.newAmountsRial);

    return assertAmountConservation(
      expectedTotal,
      actualTotal,
      input.policy.roundingToleranceRial,
    );
  }

  static validateMerge(input: ValidateMergeInput): DomainResult<void> {
    if (input.installments.length < input.policy.minMergeCount) {
      return fail(InstallmentOperationErrorCode.MERGE_MIN_COUNT);
    }

    const saleIds = new Set(input.installments.map((item) => item.saleId));
    if (saleIds.size !== 1 || !saleIds.has(input.saleId)) {
      return fail(InstallmentOperationErrorCode.INSTALLMENTS_SALE_MISMATCH);
    }

    for (const installment of input.installments) {
      try {
        InstallmentOperationsService.assertOperable(installment);
      } catch (error) {
        if (error instanceof InstallmentOperationNotAllowedError) {
          return fail(error.code);
        }
        throw error;
      }
    }

    const expectedTotal = sumAmountsRial(
      input.installments.map((item) => item.amountRial),
    );

    return assertAmountConservation(
      expectedTotal,
      input.mergedAmountRial,
      input.policy.roundingToleranceRial,
    );
  }

  static validateSplit(input: ValidateSplitInput): DomainResult<void> {
    try {
      InstallmentOperationsService.assertOperable(input.installment);
    } catch (error) {
      if (error instanceof InstallmentOperationNotAllowedError) {
        return fail(error.code);
      }
      throw error;
    }

    if (input.partAmountsRial.length < 2) {
      return fail(InstallmentOperationErrorCode.SPLIT_INVALID_PARTS);
    }

    for (const partAmount of input.partAmountsRial) {
      if (partAmount < input.policy.minPartRial) {
        return fail(InstallmentOperationErrorCode.SPLIT_INVALID_PARTS);
      }
    }

    const partsTotal = sumAmountsRial(input.partAmountsRial);
    return assertAmountConservation(
      input.installment.amountRial,
      partsTotal,
      input.policy.roundingToleranceRial,
    );
  }

  static validateUniqueSequenceNumbers(
    input: ValidateSequenceNumbersInput,
  ): DomainResult<void> {
    const seen = new Set<number>();
    for (const sequenceNumber of input.sequenceNumbers) {
      if (seen.has(sequenceNumber)) {
        return fail(InstallmentOperationErrorCode.SEQUENCE_NUMBER_DUPLICATE);
      }
      seen.add(sequenceNumber);
    }
    return ok(undefined);
  }

  static toOperationSnapshot(props: InstallmentOperationSnapshot): InstallmentOperationSnapshot {
    return { ...props };
  }
}

export function sumAmountsRial(amounts: readonly bigint[]): bigint {
  return amounts.reduce((total, amount) => total + amount, 0n);
}

export function assertAmountConservation(
  expectedRial: bigint,
  actualRial: bigint,
  toleranceRial: bigint,
): DomainResult<void> {
  const delta =
    expectedRial >= actualRial ? expectedRial - actualRial : actualRial - expectedRial;

  if (delta > toleranceRial) {
    return fail(InstallmentOperationErrorCode.AMOUNT_MISMATCH);
  }

  return ok(undefined);
}
