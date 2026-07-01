import type { DomainEvent } from '@hivork/domain';

export type OutboxPublishOptions = {
  tenantId?: string;
  aggregateType?: string;
};

/** Opaque transaction handle — infrastructure maps this to Prisma `$transaction` client. */
export type OutboxTransaction = unknown;

export interface IOutboxPublisher {
  publish(
    event: DomainEvent,
    options?: OutboxPublishOptions,
    tx?: OutboxTransaction,
  ): Promise<void>;
}

export const OUTBOX_PUBLISHER = Symbol('OUTBOX_PUBLISHER');
