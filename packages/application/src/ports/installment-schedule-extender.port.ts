import type { OutboxTransaction } from './outbox.port.js';

export type ExtendInstallmentScheduleInput = {
  tenantId: string;
  saleId: string;
  newLastDueDate: Date;
  additionalInstallmentCount?: number;
  actorId: string;
};

/** IFP-060 stub — full schedule regeneration deferred to Phase 05. */
export interface IInstallmentScheduleExtender {
  extend(input: ExtendInstallmentScheduleInput, tx?: OutboxTransaction): Promise<void>;
}

export const INSTALLMENT_SCHEDULE_EXTENDER = Symbol('INSTALLMENT_SCHEDULE_EXTENDER');
