import type { OutboxTransaction } from './outbox.port.js';

export type WaiveRemainingOnCloseInput = {
  tenantId: string;
  saleId: string;
  actorId: string;
  reason: string;
};

/** IFP-063 stub — full waive-on-close deferred to Phase 05 waive use case. */
export interface IInstallmentCloseWaiver {
  waiveRemainingOnClose(input: WaiveRemainingOnCloseInput, tx?: OutboxTransaction): Promise<void>;
}

export const INSTALLMENT_CLOSE_WAIVER = Symbol('INSTALLMENT_CLOSE_WAIVER');
