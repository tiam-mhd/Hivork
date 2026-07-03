import { randomUUID } from 'node:crypto';

import type { RunReconciliationResponseDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IReconciliationRepository } from '../ports/reconciliation.repository.port.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import {
  mapReconciliationDiscrepancyToSummary,
  mapReconciliationReportToSummary,
} from './reconciliation.mapper.js';
import {
  extractLedgerMatchKey,
  matchBankStatementToLedgerEntries,
  type BankStatementMatchRow,
} from './reconciliation-matching.js';

export type RunReconciliationInput = {
  tenantId: string;
  staffId: string;
  settlementBatchId: string;
  bankRows: BankStatementMatchRow[];
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RunReconciliationResult = RunReconciliationResponseDto;

export class RunReconciliationUseCase
  implements UseCase<RunReconciliationInput, RunReconciliationResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly settlements: ISettlementBatchRepository,
    private readonly reconciliations: IReconciliationRepository,
  ) {}

  async execute(input: RunReconciliationInput): Promise<RunReconciliationResult> {
    if (input.bankRows.length === 0) {
      throw new ApplicationError('BANK_STATEMENT_EMPTY', 'Bank statement file is empty.', 400);
    }

    const batch = await this.settlements.findById(input.tenantId, input.settlementBatchId);
    if (!batch) {
      throw new ApplicationError('SETTLEMENT_NOT_FOUND', 'Settlement batch was not found.', 404);
    }

    this.assertBatchInScope(batch.branchId, input.staffContext);

    if (batch.status !== 'CLOSED') {
      throw new ApplicationError(
        'SETTLEMENT_NOT_CLOSED',
        'Settlement batch must be closed before reconciliation.',
        409,
      );
    }

    const ledgerEntries = await this.settlements.findLedgerEntriesForReconciliation(
      input.tenantId,
      input.settlementBatchId,
    );

    const reconciliationEntries = ledgerEntries.map((entry) => ({
      ...entry,
      matchKey: extractLedgerMatchKey(entry, entry.paymentAttemptMetadata),
    }));

    const matchResult = matchBankStatementToLedgerEntries(input.bankRows, reconciliationEntries);
    const reportId = randomUUID();

    const report = await this.unitOfWork.transaction(async (tx) =>
      this.reconciliations.createReportWithDiscrepancies(
        {
          id: reportId,
          tenantId: input.tenantId,
          settlementBatchId: input.settlementBatchId,
          matchedCount: matchResult.matchedCount,
          discrepancyCount: matchResult.discrepancies.length,
          bankTotalRial: matchResult.bankTotalRial,
          systemTotalRial: matchResult.systemTotalRial,
          discrepancies: matchResult.discrepancies.map((discrepancy) => ({
            id: randomUUID(),
            tenantId: input.tenantId,
            reconciliationReportId: reportId,
            discrepancyType: discrepancy.discrepancyType,
            bankReference: discrepancy.bankReference,
            bankAmountRial: discrepancy.bankAmountRial,
            ledgerEntryId: discrepancy.ledgerEntryId,
            systemAmountRial: discrepancy.systemAmountRial,
            createdById: input.staffId,
          })),
          createdById: input.staffId,
        },
        tx,
      ),
    );

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
      throw new ApplicationError('SETTLEMENT_NOT_FOUND', 'Settlement batch was not found.', 404);
    }
  }
}
