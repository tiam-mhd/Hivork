import type { IPasswordHasherPort } from '../ports/password-hasher.port.js';
import { ApplicationError } from '../errors/application.error.js';

export const PASSWORD_HISTORY_MAX = 3;

export async function assertPasswordNotReused(
  plainPassword: string,
  currentHash: string,
  history: string[],
  hasher: IPasswordHasherPort,
): Promise<void> {
  const candidates = [currentHash, ...history].slice(0, PASSWORD_HISTORY_MAX);

  for (const hash of candidates) {
    if (await hasher.verify(plainPassword, hash)) {
      throw new ApplicationError(
        'AUTH_PASSWORD_REUSED',
        'You cannot reuse a recent password. Choose a different password.',
        400,
      );
    }
  }
}

export function buildNextPasswordHistory(currentHash: string, history: string[]): string[] {
  return [currentHash, ...history].slice(0, PASSWORD_HISTORY_MAX);
}
