import type { OutboxTransaction } from './outbox.port.js';

export interface IUnitOfWork {
  transaction<T>(work: (tx: OutboxTransaction) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
