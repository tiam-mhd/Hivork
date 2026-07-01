import { createHash } from 'node:crypto';

export function hashRefreshTokenJti(jti: string): string {
  return createHash('sha256').update(jti).digest('hex');
}
