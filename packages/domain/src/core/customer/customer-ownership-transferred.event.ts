import { DomainEvent } from '../../events/domain-event.base.js';

export type CustomerOwnershipTransferredPayload = {
  tenantCustomerId: string;
  fromStaffId: string | null;
  toStaffId: string;
  byStaffId: string;
  note?: string;
};

/** Stub notification event — worker handler out of scope for IFP-051. */
export class CustomerOwnershipTransferredEvent extends DomainEvent {
  readonly eventType = 'customer.ownership_transferred';

  constructor(
    readonly aggregateId: string,
    private readonly payload: CustomerOwnershipTransferredPayload,
  ) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
