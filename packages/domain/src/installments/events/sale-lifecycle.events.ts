import { DomainEvent } from '../../events/domain-event.base.js';

export type SaleTerminatedPayload = {
  saleId: string;
  tenantId: string;
  actorId: string;
  reason: string;
  effectiveDate: string;
};

export class SaleTerminatedEvent extends DomainEvent {
  readonly eventType = 'sale.terminated';

  constructor(
    readonly aggregateId: string,
    private readonly payload: SaleTerminatedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}

export type SaleClosedPayload = {
  saleId: string;
  tenantId: string;
  actorId: string;
  reason: string;
  waiveRemaining: boolean;
  closedAt: string;
};

export class SaleClosedEvent extends DomainEvent {
  readonly eventType = 'sale.closed';

  constructor(
    readonly aggregateId: string,
    private readonly payload: SaleClosedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}

export type SaleArchivedPayload = {
  saleId: string;
  tenantId: string;
  actorId: string;
  reason: string;
  archivedFromStatus: string;
  archivedAt: string;
};

export class SaleArchivedEvent extends DomainEvent {
  readonly eventType = 'sale.archived';

  constructor(
    readonly aggregateId: string,
    private readonly payload: SaleArchivedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
