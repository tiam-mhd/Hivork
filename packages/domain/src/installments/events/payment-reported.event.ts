import { DomainEvent } from '../../events/domain-event.base.js';

export type PaymentReportedPayload = {
  tenantId: string;
  installmentId: string;
  paymentAttemptId: string;
  amountRial: string;
  method: string;
  reportedByType: 'staff' | 'customer';
};

export class PaymentReportedEvent extends DomainEvent {
  readonly eventType = 'payment.reported';

  constructor(
    readonly aggregateId: string,
    private readonly payload: PaymentReportedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
