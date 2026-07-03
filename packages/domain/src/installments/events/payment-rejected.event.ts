import { DomainEvent } from '../../events/domain-event.base.js';

export type PaymentRejectedPayload = {
  tenantId: string;
  tenantCustomerId: string;
  installmentId: string;
  paymentAttemptId: string;
  rejectedReason: string;
};

export class PaymentRejectedEvent extends DomainEvent {
  readonly eventType = 'payment.rejected';

  constructor(
    readonly aggregateId: string,
    private readonly payload: PaymentRejectedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
