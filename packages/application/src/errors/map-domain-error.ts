import { DomainError } from '@hivork/domain';

import { ApplicationError } from './application.error.js';

const DOMAIN_ERROR_HTTP: Record<string, number> = {
  ALREADY_DELETED: 409,
  NOT_DELETED: 409,
  CUSTOMER_DELETED: 409,
  DELETE_FORBIDDEN: 403,
  FIELD_TOO_LONG: 400,
  TOO_MANY_TAGS: 400,
  TAG_TOO_LONG: 400,
  INVALID_NAME: 400,
  CUSTOMER_PSEUDONYMIZED: 409,
  CANNOT_RESTORE_PSEUDONYMIZED: 409,
  AMOUNT_MUST_BE_POSITIVE: 400,
  AMOUNT_EXCEEDS_TOTAL: 400,
  INSTALLMENT_COUNT_INVALID: 400,
  DUE_DATE_IN_PAST: 400,
  INTERVAL_INVALID: 400,
  INSTALLMENT_SUM_MISMATCH: 400,
  SALE_ALREADY_CANCELLED: 409,
  SALE_ALREADY_COMPLETED: 409,
  SALE_HAS_PAID_INSTALLMENT: 409,
  INSTALLMENT_STATUS_INVALID: 400,
  INVALID_BRANCH_NAME: 400,
  CANNOT_DEACTIVATE_DEFAULT_BRANCH: 409,
};

export function mapDomainError(error: unknown): ApplicationError {
  if (error instanceof DomainError) {
    return new ApplicationError(
      error.code,
      error.message,
      DOMAIN_ERROR_HTTP[error.code] ?? 400,
    );
  }

  throw error;
}
