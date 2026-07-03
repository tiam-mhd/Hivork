import type { GetSettlementBatchResponseDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapSettlementBatchToSummary } from './settlement.mapper.js';

export type GetSettlementBatchInput = {
  tenantId: string;
  settlementBatchId: string;
  staffContext: DataScopeStaffContext;
};

export type GetSettlementBatchResult = GetSettlementBatchResponseDto;

export class GetSettlementBatchUseCase
  implements UseCase<GetSettlementBatchInput, GetSettlementBatchResult>
{
  constructor(private readonly settlements: ISettlementBatchRepository) {}

  async execute(input: GetSettlementBatchInput): Promise<GetSettlementBatchResult> {
    const batch = await this.settlements.findByIdWithEntries(
      input.tenantId,
      input.settlementBatchId,
    );

    if (!batch) {
      throw new ApplicationError('SETTLEMENT_NOT_FOUND', 'Settlement batch was not found.', 404);
    }

    this.assertBatchInScope(batch.branchId, input.staffContext);

    return {
      settlement: mapSettlementBatchToSummary(batch),
      entries: batch.entries.map((entry) => ({
        id: entry.id,
        ledgerEntryId: entry.ledgerEntryId,
        amountRial: entry.ledgerEntry.amountRial.toString(),
        paymentMethod: entry.ledgerEntry.paymentMethod,
        occurredAt: entry.ledgerEntry.occurredAt.toISOString(),
      })),
    };
  }

  private assertBatchInScope(branchId: string, staffContext: DataScopeStaffContext): void {
    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError('SETTLEMENT_NOT_FOUND', 'Settlement batch was not found.', 404);
    }
  }
}
