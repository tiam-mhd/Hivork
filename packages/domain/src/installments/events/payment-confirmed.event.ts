import { DomainEvent } from '../../events/domain-event.base.js';

export type PaymentConfirmedPayload = {
  tenantId: string;
  tenantCustomerId: string;
  installmentId: string;
  paymentAttemptId: string;
  wasOverdueInstallment: boolean;
};

export class PaymentConfirmedEvent extends DomainEvent {
  readonly eventType = 'payment.confirmed';

  constructor(
    readonly aggregateId: string,
    private readonly payload: PaymentConfirmedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
