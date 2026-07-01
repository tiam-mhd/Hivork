import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadRootEnv(): void {
  const envPath = resolve(__dirname, '../../.env');
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

process.env.DATABASE_URL ??= 'postgresql://hivork:hivork_dev@localhost:5432/hivork?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-minimum-32-chars!!';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-minimum-32-chars!';
process.env.MFA_ENCRYPTION_KEY ??=
  Buffer.from('01234567890123456789012345678901').toString('base64');
process.env.CAPTCHA_BYPASS_TOKEN ??= 'test-bypass';
process.env.NODE_ENV ??= 'test';
