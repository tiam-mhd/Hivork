import { describe, expect, it, vi } from 'vitest';

import { generateBackupCodes, verifyBackupCode } from './backup-codes.js';

describe('backup codes', () => {
  const hasher = {
    hash: vi.fn(async (plain: string) => `hash:${plain}`),
    verify: vi.fn(async (plain: string, hash: string) => hash === `hash:${plain}`),
  };

  it('generates 10 unique formatted codes with hashed storage', async () => {
    const { plain, hashed } = await generateBackupCodes(10, hasher);

    expect(plain).toHaveLength(10);
    expect(hashed).toHaveLength(10);
    for (const code of plain) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
    expect(new Set(plain).size).toBe(10);
  });

  it('verifies a valid unused backup code', async () => {
    const { plain, hashed } = await generateBackupCodes(1, hasher);
    const code = plain[0]!;

    const result = await verifyBackupCode(code, hashed, hasher);
    expect(result).toEqual({ ok: true, index: 0 });
  });

  it('rejects a reused backup code', async () => {
    const { plain, hashed } = await generateBackupCodes(1, hasher);
    const code = plain[0]!;
    hashed[0] = { hash: hashed[0]!.hash, usedAt: new Date().toISOString() };

    const result = await verifyBackupCode(code, hashed, hasher);
    expect(result).toEqual({ ok: false, reason: 'used' });
  });
});
