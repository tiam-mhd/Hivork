import type { OutboxTransaction } from './outbox.port.js';

export const CONTRACT_NUMBER_SEQUENCE_KEY = 'contract_number';

export interface ITenantSequenceRepository {
  /** Next value that would be allocated (defaults to 1 when unset). */
  peekNextValue(tenantId: string, sequenceKey: string, tx?: OutboxTransaction): Promise<number>;

  /** Atomically reserves and returns the allocated sequence value. */
  allocateNextValue(tenantId: string, sequenceKey: string, tx?: OutboxTransaction): Promise<number>;
}

export const TENANT_SEQUENCE_REPOSITORY = Symbol('TENANT_SEQUENCE_REPOSITORY');
