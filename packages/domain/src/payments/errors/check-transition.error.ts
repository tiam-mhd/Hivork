import { DomainError } from '../../errors/domain.error.js';
import type { CheckDomainErrorCode } from './check.errors.js';

/** Thrown when a check lifecycle transition is not allowed — IFP-112 */
export class CheckTransitionError extends DomainError {
  constructor(code: CheckDomainErrorCode) {
    super(code);
    this.name = 'CheckTransitionError';
  }
}
