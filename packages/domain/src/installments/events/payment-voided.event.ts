import { DomainEvent } from '../../events/domain-event.base.js';

export type PaymentVoidedPayload = {
  tenantId: string;
  tenantCustomerId: string;
  installmentId: string;
  paymentAttemptId: string;
  voidReason: string;
  amountRial: string;
};

export class PaymentVoidedEvent extends DomainEvent {
  readonly eventType = 'payment.voided';

  constructor(
    readonly aggregateId: string,
    private readonly payload: PaymentVoidedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
