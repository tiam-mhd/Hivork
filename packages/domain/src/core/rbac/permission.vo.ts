import { DomainError } from '../../errors/domain.error.js';

const PERMISSION_CODE_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export class Permission {
  constructor(readonly code: string) {
    if (!PERMISSION_CODE_PATTERN.test(code)) {
      throw new DomainError('INVALID_PERMISSION_CODE');
    }
  }

  equals(other: Permission): boolean {
    return this.code === other.code;
  }
}
