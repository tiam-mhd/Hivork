import { describe, expect, it, vi } from 'vitest';

import {
  assertPasswordNotReused,
  buildNextPasswordHistory,
} from './password-history.js';

describe('password history', () => {
  const hasher = {
    hash: vi.fn(),
    verify: vi.fn(async (plain: string, hash: string) => plain === hash),
  };

  it('builds rolling history capped at 3', () => {
    expect(buildNextPasswordHistory('h1', ['h0'])).toEqual(['h1', 'h0']);
    expect(buildNextPasswordHistory('h3', ['h2', 'h1', 'h0'])).toEqual(['h3', 'h2', 'h1']);
  });

  it('rejects reused passwords', async () => {
    await expect(
      assertPasswordNotReused('same', 'same', ['old1'], hasher),
    ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_REUSED' });
  });

  it('allows new passwords', async () => {
    await expect(
      assertPasswordNotReused('brand-new', 'current', ['old1'], hasher),
    ).resolves.toBeUndefined();
  });
});
