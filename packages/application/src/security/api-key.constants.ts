import { createHash, randomBytes } from 'node:crypto';

import { API_KEY_PREFIX, API_KEY_RANDOM_LENGTH } from '@hivork/contracts/settings';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function isApiKeyFormat(rawKey: string): boolean {
  return rawKey.startsWith(API_KEY_PREFIX) && rawKey.length === API_KEY_PREFIX.length + API_KEY_RANDOM_LENGTH;
}

export function extractApiKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}

export function generateApiKeySecret(): string {
  const bytes = randomBytes(API_KEY_RANDOM_LENGTH);
  let suffix = '';
  for (let index = 0; index < API_KEY_RANDOM_LENGTH; index += 1) {
    suffix += BASE62[bytes[index]! % BASE62.length];
  }
  return `${API_KEY_PREFIX}${suffix}`;
}

export const MAX_TENANT_API_KEYS = 10;

export const API_KEY_RATE_LIMIT = 1000;
export const API_KEY_RATE_WINDOW_SECONDS = 3600;
