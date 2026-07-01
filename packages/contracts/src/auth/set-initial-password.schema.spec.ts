import { describe, expect, it } from 'vitest';

import { SetInitialPasswordSchema } from './set-initial-password.schema.js';

describe('SetInitialPasswordSchema', () => {
  it('accepts valid password pairs', () => {
    const parsed = SetInitialPasswordSchema.safeParse({
      password: 'Secret1pass',
      passwordConfirm: 'Secret1pass',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects weak passwords', () => {
    const parsed = SetInitialPasswordSchema.safeParse({
      password: 'short',
      passwordConfirm: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects mismatched confirmation', () => {
    const parsed = SetInitialPasswordSchema.safeParse({
      password: 'Secret1pass',
      passwordConfirm: 'Secret1other',
    });
    expect(parsed.success).toBe(false);
  });
});
