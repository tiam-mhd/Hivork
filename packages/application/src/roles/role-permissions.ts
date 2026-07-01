import { Permission } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import type { IPermissionRegistry } from '../ports/permission.registry.port.js';

export async function resolveValidatedPermissionIds(
  registry: IPermissionRegistry,
  codes: string[],
): Promise<Map<string, string>> {
  if (codes.length === 0) {
    throw new ApplicationError(
      'VALIDATION_ERROR',
      'At least one permission is required.',
      400,
      { field: 'permissions' },
    );
  }

  const unique = [...new Set(codes)];
  if (unique.length !== codes.length) {
    throw new ApplicationError('VALIDATION_ERROR', 'Duplicate permission codes are not allowed.', 400);
  }

  for (const code of unique) {
    try {
      new Permission(code);
    } catch (error) {
      throw mapDomainError(error);
    }
  }

  try {
    return await registry.resolvePermissionIds(unique);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === 'PERMISSION_NOT_FOUND') {
      throw error;
    }
    throw error;
  }
}
