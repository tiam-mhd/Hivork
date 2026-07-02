import type { OutboxTransaction } from './outbox.port.js';

/** IFP-074 — atomic contract number allocation (stub until settings numbering ships). */
export interface IContractNumberAllocator {
  allocate(tenantId: string, tx?: OutboxTransaction): Promise<string>;
}

export const CONTRACT_NUMBER_ALLOCATOR = Symbol('CONTRACT_NUMBER_ALLOCATOR');
