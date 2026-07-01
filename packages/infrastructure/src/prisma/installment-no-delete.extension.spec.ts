import { describe, expect, it } from 'vitest';

import { InstallmentCannotDeleteError } from './errors/installment-cannot-delete.error.js';
import { NO_DELETE_MODELS } from './prisma-extension.config.js';

describe('NO_DELETE_MODELS policy (TASK-062)', () => {
  it('includes Installment', () => {
    expect(NO_DELETE_MODELS).toContain('Installment');
  });

  it('throws INSTALLMENT_CANNOT_DELETE from error class', () => {
    const error = new InstallmentCannotDeleteError('Installment');
    expect(error.code).toBe('INSTALLMENT_CANNOT_DELETE');
    expect(error.message).toContain('append-only');
  });
});
