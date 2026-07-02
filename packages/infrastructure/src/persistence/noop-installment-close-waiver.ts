import type {
  IInstallmentCloseWaiver,
  OutboxTransaction,
  WaiveRemainingOnCloseInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

/** IFP-063 / Phase 05 — no-op until waive remaining installments on close is implemented. */
@Injectable()
export class NoOpInstallmentCloseWaiver implements IInstallmentCloseWaiver {
  async waiveRemainingOnClose(
    _input: WaiveRemainingOnCloseInput,
    _tx?: OutboxTransaction,
  ): Promise<void> {
    // Waive-on-close deferred to Phase 05 installment waive use case.
  }
}
