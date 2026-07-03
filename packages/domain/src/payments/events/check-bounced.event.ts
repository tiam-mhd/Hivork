import { DomainEvent } from '../../events/domain-event.base.js';

export type CheckBouncedPayload = {
  tenantId: string;
  checkId: string;
  checkType: 'received';
  checkNumber: string;
  bankName: string;
  amountRial: string;
  bounceReason: string;
  bouncedAt: string;
  installmentId: string | null;
  paymentAttemptId: string | null;
  previousStatus: string;
};

export class CheckBouncedEvent extends DomainEvent {
  readonly eventType = 'check.bounced';

  constructor(
    readonly aggregateId: string,
    private readonly payload: CheckBouncedPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
