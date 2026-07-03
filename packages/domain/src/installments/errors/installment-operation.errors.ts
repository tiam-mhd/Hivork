import { DomainError } from '../../errors/domain.error.js';
import { InstallmentDomainErrorCode } from '../errors.js';

/** Installment advanced-operation domain error codes — IFP-079 / IFP-080+ */
export const InstallmentOperationErrorCode = {
  INSTALLMENT_OPERATION_NOT_ALLOWED: 'INSTALLMENT_OPERATION_NOT_ALLOWED',
  INSTALLMENT_STATUS_INVALID: InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID,
  INSTALLMENT_ALREADY_WAIVED: InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED,
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MERGE_MIN_COUNT: 'MERGE_MIN_COUNT',
  SPLIT_INVALID_PARTS: 'SPLIT_INVALID_PARTS',
  REGENERATE_PAID_BLOCKED: 'REGENERATE_PAID_BLOCKED',
  DEFER_MAX_EXCEEDED: 'DEFER_MAX_EXCEEDED',
  DEFER_DAYS_INVALID: 'DEFER_DAYS_INVALID',
  DUE_DATE_IN_PAST: 'DUE_DATE_IN_PAST',
  ACCELERATE_DATE_INVALID: 'ACCELERATE_DATE_INVALID',
  SALE_STATUS_INVALID: 'SALE_STATUS_INVALID',
  SEQUENCE_NUMBER_DUPLICATE: 'SEQUENCE_NUMBER_DUPLICATE',
  INSTALLMENTS_SALE_MISMATCH: 'INSTALLMENTS_SALE_MISMATCH',
} as const;

export type InstallmentOperationErrorCode =
  (typeof InstallmentOperationErrorCode)[keyof typeof InstallmentOperationErrorCode];

/** Thrown when an installment operation is blocked by status or business rules. */
export class InstallmentOperationNotAllowedError extends DomainError {
  constructor(code: InstallmentOperationErrorCode, message?: string) {
    super(code, message);
    this.name = 'InstallmentOperationNotAllowedError';
  }
}

export function throwInstallmentOperationError(code: InstallmentOperationErrorCode): never {
  throw new InstallmentOperationNotAllowedError(code);
}
