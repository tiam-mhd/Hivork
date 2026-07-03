import type { GetReconciliationReportResponseDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IReconciliationRepository } from '../ports/reconciliation.repository.port.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import {
  mapReconciliationDiscrepancyToSummary,
  mapReconciliationReportToSummary,
} from './reconciliation.mapper.js';

export type GetReconciliationReportInput = {
  tenantId: string;
  reconciliationReportId: string;
  staffContext: DataScopeStaffContext;
};

export type GetReconciliationReportResult = GetReconciliationReportResponseDto;

export class GetReconciliationReportUseCase
  implements UseCase<GetReconciliationReportInput, GetReconciliationReportResult>
{
  constructor(
    private readonly reconciliations: IReconciliationRepository,
    private readonly settlements: ISettlementBatchRepository,
  ) {}

  async execute(input: GetReconciliationReportInput): Promise<GetReconciliationReportResult> {
    const report = await this.reconciliations.findReportById(
      input.tenantId,
      input.reconciliationReportId,
    );

    if (!report) {
      throw new ApplicationError(
        'RECONCILIATION_NOT_FOUND',
        'Reconciliation report was not found.',
        404,
      );
    }

    const batch = await this.settlements.findById(input.tenantId, report.settlementBatchId);
    if (!batch) {
      throw new ApplicationError(
        'RECONCILIATION_NOT_FOUND',
        'Reconciliation report was not found.',
        404,
      );
    }

    this.assertBatchInScope(batch.branchId, input.staffContext);

    return {
      report: mapReconciliationReportToSummary(report),
      discrepancies: report.discrepancies.map(mapReconciliationDiscrepancyToSummary),
    };
  }

  private assertBatchInScope(branchId: string, staffContext: DataScopeStaffContext): void {
    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'RECONCILIATION_NOT_FOUND',
        'Reconciliation report was not found.',
        404,
      );
    }
  }
}
