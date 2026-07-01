import { DomainError } from '../../errors/domain.error.js';

export type DataScope = 'all' | 'branch' | 'own';

const DATA_SCOPES = new Set<DataScope>(['all', 'branch', 'own']);

export function parseDataScope(value: string): DataScope {
  if (!DATA_SCOPES.has(value as DataScope)) {
    throw new DomainError('INVALID_DATA_SCOPE');
  }
  return value as DataScope;
}

export function isDataScope(value: string): value is DataScope {
  return DATA_SCOPES.has(value as DataScope);
}
