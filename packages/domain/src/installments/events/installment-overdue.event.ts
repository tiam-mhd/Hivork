import { DomainEvent } from '../../events/domain-event.base.js';

export type InstallmentOverduePayload = {
  tenantId: string;
  tenantCustomerId: string;
  installmentId: string;
  saleId: string;
};

export class InstallmentOverdueEvent extends DomainEvent {
  readonly eventType = 'installment.overdue';

  constructor(
    readonly aggregateId: string,
    private readonly payload: InstallmentOverduePayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
