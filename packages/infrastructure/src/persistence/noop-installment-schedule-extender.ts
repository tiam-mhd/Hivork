import type {
  ExtendInstallmentScheduleInput,
  IInstallmentScheduleExtender,
  OutboxTransaction,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

/** IFP-060 / Phase 05 — no-op until installment schedule regeneration is implemented. */
@Injectable()
export class NoOpInstallmentScheduleExtender implements IInstallmentScheduleExtender {
  async extend(_input: ExtendInstallmentScheduleInput, _tx?: OutboxTransaction): Promise<void> {
    // Schedule regeneration deferred to Phase 05 (IFP installment schedule service).
  }
}
