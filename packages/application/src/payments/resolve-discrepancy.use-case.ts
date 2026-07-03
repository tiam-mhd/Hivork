import type { ResolveDiscrepancyResponseDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IReconciliationRepository } from '../ports/reconciliation.repository.port.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapReconciliationDiscrepancyToSummary } from './reconciliation.mapper.js';

export type ResolveDiscrepancyInput = {
  tenantId: string;
  staffId: string;
  discrepancyId: string;
  resolveNote: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ResolveDiscrepancyResult = ResolveDiscrepancyResponseDto;

export class ResolveDiscrepancyUseCase
  implements UseCase<ResolveDiscrepancyInput, ResolveDiscrepancyResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly reconciliations: IReconciliationRepository,
    private readonly settlements: ISettlementBatchRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ResolveDiscrepancyInput): Promise<ResolveDiscrepancyResult> {
    const resolveNote = input.resolveNote.trim();
    if (!resolveNote) {
      throw new ApplicationError('VALIDATION_ERROR', 'Resolve note is required.', 400);
    }

    const existing = await this.reconciliations.findDiscrepancyById(
      input.tenantId,
      input.discrepancyId,
    );

    if (!existing) {
      throw new ApplicationError('DISCREPANCY_NOT_FOUND', 'Discrepancy was not found.', 404);
    }

    const report = await this.reconciliations.findReportById(
      input.tenantId,
      existing.reconciliationReportId,
    );

    if (!report) {
      throw new ApplicationError('DISCREPANCY_NOT_FOUND', 'Discrepancy was not found.', 404);
    }

    const batch = await this.settlements.findById(input.tenantId, report.settlementBatchId);
    if (!batch) {
      throw new ApplicationError('DISCREPANCY_NOT_FOUND', 'Discrepancy was not found.', 404);
    }

    this.assertBatchInScope(batch.branchId, input.staffContext);

    if (existing.status === 'RESOLVED' || existing.status === 'IGNORED') {
      throw new ApplicationError(
        'DISCREPANCY_ALREADY_RESOLVED',
        'Discrepancy is already resolved.',
        409,
      );
    }

    const resolvedAt = new Date();

    const discrepancy = await this.unitOfWork.transaction(async (tx) => {
      const result = await this.reconciliations.resolveDiscrepancy(
        {
          tenantId: input.tenantId,
          id: input.discrepancyId,
          expectedVersion: input.expectedVersion,
          resolveNote,
          resolvedAt,
          resolvedById: input.staffId,
          updatedById: input.staffId,
        },
        tx,
      );

      if (result.outcome === 'not_found') {
        throw new ApplicationError('DISCREPANCY_NOT_FOUND', 'Discrepancy was not found.', 404);
      }

      if (result.outcome === 'already_resolved') {
        throw new ApplicationError(
          'DISCREPANCY_ALREADY_RESOLVED',
          'Discrepancy is already resolved.',
          409,
        );
      }

      if (result.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Discrepancy version conflict.',
          409,
          { currentVersion: result.currentVersion },
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'reconciliation.resolve',
          entityType: 'ReconciliationDiscrepancy',
          entityId: result.discrepancy.id,
          oldValue: { status: 'open' },
          newValue: {
            status: 'resolved',
            resolveNote,
            discrepancyType: result.discrepancy.discrepancyType,
          },
          metadata: {
            reconciliationReportId: result.discrepancy.reconciliationReportId,
            ledgerEntryId: result.discrepancy.ledgerEntryId,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return result.discrepancy;
    });

    return {
      discrepancy: mapReconciliationDiscrepancyToSummary(discrepancy),
    };
  }

  private assertBatchInScope(branchId: string, staffContext: DataScopeStaffContext): void {
    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError('DISCREPANCY_NOT_FOUND', 'Discrepancy was not found.', 404);
    }
  }
}
