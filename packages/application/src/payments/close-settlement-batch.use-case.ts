import type { CloseSettlementBatchResponseDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPaymentAttemptRepository } from '../ports/payment-attempt.repository.port.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapSettlementBatchToSummary } from './settlement.mapper.js';

export type CloseSettlementBatchInput = {
  tenantId: string;
  staffId: string;
  settlementBatchId: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CloseSettlementBatchResult = CloseSettlementBatchResponseDto;

export class CloseSettlementBatchUseCase
  implements UseCase<CloseSettlementBatchInput, CloseSettlementBatchResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly settlements: ISettlementBatchRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CloseSettlementBatchInput): Promise<CloseSettlementBatchResult> {
    const existing = await this.settlements.findById(input.tenantId, input.settlementBatchId);
    if (!existing) {
      throw new ApplicationError('SETTLEMENT_NOT_FOUND', 'Settlement batch was not found.', 404);
    }

    this.assertBatchInScope(existing.branchId, input.staffContext);

    if (existing.status === 'CLOSED') {
      throw new ApplicationError(
        'SETTLEMENT_ALREADY_CLOSED',
        'Settlement batch is already closed.',
        409,
      );
    }

    const closedAt = new Date();

    const batch = await this.unitOfWork.transaction(async (tx) => {
      const closeResult = await this.settlements.close(
        {
          tenantId: input.tenantId,
          id: input.settlementBatchId,
          expectedVersion: input.expectedVersion,
          closedAt,
          closedById: input.staffId,
          updatedById: input.staffId,
        },
        tx,
      );

      if (closeResult.outcome === 'not_found') {
        throw new ApplicationError('SETTLEMENT_NOT_FOUND', 'Settlement batch was not found.', 404);
      }

      if (closeResult.outcome === 'already_closed') {
        throw new ApplicationError(
          'SETTLEMENT_ALREADY_CLOSED',
          'Settlement batch is already closed.',
          409,
        );
      }

      if (closeResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Settlement batch version conflict.',
          409,
          { currentVersion: closeResult.currentVersion },
        );
      }

      const linkedEntries = await this.settlements.listLedgerEntryIdsForBatch(
        input.tenantId,
        input.settlementBatchId,
        tx,
      );

      const attemptIds = [
        ...new Set(
          linkedEntries
            .map((entry) => entry.paymentAttemptId)
            .filter((id): id is string => id !== null),
        ),
      ];

      for (const attemptId of attemptIds) {
        await this.paymentAttempts.updateMetadata(
          {
            tenantId: input.tenantId,
            id: attemptId,
            metadataPatch: { settlementBatchClosed: true },
            updatedById: input.staffId,
          },
          tx,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'settlement.close',
          entityType: 'SettlementBatch',
          entityId: closeResult.batch.id,
          oldValue: { status: 'open' },
          newValue: {
            status: 'closed',
            closedAt: closedAt.toISOString(),
            entryCount: closeResult.batch.entryCount,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return closeResult.batch;
    });

    return {
      settlement: mapSettlementBatchToSummary(batch),
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
