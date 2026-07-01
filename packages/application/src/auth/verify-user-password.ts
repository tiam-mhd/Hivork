import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import type { IUserCredentialRepository } from '../ports/user-credential.repository.port.js';
import type { IPasswordHasherPort } from '../ports/password-hasher.port.js';
import { DomainError } from '@hivork/domain';

export async function verifyUserPassword(
  userId: string,
  password: string,
  credentialRepository: IUserCredentialRepository,
  passwordHasher: IPasswordHasherPort,
): Promise<void> {
  const credential = await credentialRepository.findByUserId(userId);
  if (!credential) {
    throw new ApplicationError(
      'AUTH_INVALID_CREDENTIALS',
      'Invalid phone number or password.',
      401,
    );
  }

  try {
    const valid = await credential.verifyPassword(password, passwordHasher);
    if (!valid) {
      throw new ApplicationError(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid phone number or password.',
        401,
      );
    }
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }
    if (error instanceof DomainError && error.code === 'CREDENTIAL_LOCKED') {
      throw new ApplicationError(
        'AUTH_ACCOUNT_LOCKED',
        'Account is temporarily locked due to too many failed attempts.',
        423,
      );
    }
    throw mapDomainError(error);
  }
}
