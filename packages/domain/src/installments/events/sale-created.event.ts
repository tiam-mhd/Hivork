import { DomainEvent } from '../../events/domain-event.base.js';

export type SaleCreatedPayload = {
  saleId: string;
  tenantCustomerId: string;
  branchId: string;
  totalAmountRial: string;
  installmentCount: number;
};

export class SaleCreatedEvent extends DomainEvent {
  readonly eventType = 'sale.created';

  constructor(
    readonly aggregateId: string,
    private readonly payload: SaleCreatedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
