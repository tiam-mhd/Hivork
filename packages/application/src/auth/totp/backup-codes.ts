import { randomInt } from 'node:crypto';

import type { BackupCodeEntry } from '@hivork/domain';

import type { IPasswordHasherPort } from '../../ports/password-hasher.port.js';

const BACKUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const BACKUP_CODE_COUNT = 10;

export function generateBackupCodePlain(): string {
  const part = () =>
    Array.from({ length: 4 }, () => BACKUP_CODE_CHARS[randomInt(BACKUP_CODE_CHARS.length)]).join('');
  return `${part()}-${part()}`;
}

export async function generateBackupCodes(
  count: number,
  hasher: IPasswordHasherPort,
): Promise<{ plain: string[]; hashed: BackupCodeEntry[] }> {
  const plain: string[] = [];
  const hashed: BackupCodeEntry[] = [];

  for (let i = 0; i < count; i += 1) {
    const code = generateBackupCodePlain();
    plain.push(code);
    hashed.push({
      hash: await hasher.hash(code),
      usedAt: null,
    });
  }

  return { plain, hashed };
}

export async function verifyBackupCode(
  code: string,
  entries: BackupCodeEntry[],
  hasher: IPasswordHasherPort,
): Promise<{ ok: true; index: number } | { ok: false; reason: 'invalid' | 'used' }> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) {
      continue;
    }

    if (entry.usedAt !== null) {
      const matches = await hasher.verify(normalized, entry.hash);
      if (matches) {
        return { ok: false, reason: 'used' };
      }
      continue;
    }

    const matches = await hasher.verify(normalized, entry.hash);
    if (matches) {
      return { ok: true, index };
    }
  }

  return { ok: false, reason: 'invalid' };
}
