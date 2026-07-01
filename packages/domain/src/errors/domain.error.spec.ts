import { describe, expect, it } from 'vitest';

import { DomainError } from './domain.error.js';

describe('DomainError', () => {
  it('uses code as message when message is omitted', () => {
    const error = new DomainError('ALREADY_PAID');

    expect(error.code).toBe('ALREADY_PAID');
    expect(error.message).toBe('ALREADY_PAID');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DomainError');
  });

  it('uses custom message when provided', () => {
    const error = new DomainError('INVALID_STATE', 'Cannot mark as paid');

    expect(error.code).toBe('INVALID_STATE');
    expect(error.message).toBe('Cannot mark as paid');
  });
});
