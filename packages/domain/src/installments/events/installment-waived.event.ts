import { DomainEvent } from '../../events/domain-event.base.js';

export type InstallmentWaivedPayload = {
  tenantId: string;
  tenantCustomerId: string;
  saleId: string;
  installmentId: string;
  waiveReason: string;
  amountRial: string;
  remainingRial: string;
};

export class InstallmentWaivedEvent extends DomainEvent {
  readonly eventType = 'installment.waived';

  constructor(
    readonly aggregateId: string,
    private readonly payload: InstallmentWaivedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
