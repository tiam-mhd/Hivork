import { assertPenaltyWithinMax } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentAdjustmentRepository } from '../../ports/installment-adjustment.repository.port.js';
import type { IInstallmentOperationLogRepository } from '../../ports/installment-operation-log.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  installmentRecordToOperationSnapshot,
  serializeOperationSnapshots,
} from '../installment-operation-snapshot.helper.js';
import {
  assertNoAutoPenaltyAppliedToday,
  loadOverdueInstallmentPenaltyContext,
  mapPenaltyMaxExceeded,
  resolveAutoPenaltyAmount,
} from './penalty.helpers.js';

export type ApplyPenaltyInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  mode: 'manual' | 'auto';
  amountRial?: bigint;
  reason: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ApplyPenaltyResult = {
  adjustment: {
    id: string;
    amountRial: string;
    reason: string;
    appliedAt: Date;
  };
  installment: {
    id: string;
    amountRial: string;
    version: number;
  };
  remainingRial: string;
  operationLogId: string;
};

export class ApplyPenaltyUseCase implements UseCase<ApplyPenaltyInput, ApplyPenaltyResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly adjustments: IInstallmentAdjustmentRepository,
    private readonly operationLogs: IInstallmentOperationLogRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ApplyPenaltyInput): Promise<ApplyPenaltyResult> {
    const reason = input.reason.trim();

    return this.unitOfWork.transaction(async (tx) => {
      const context = await loadOverdueInstallmentPenaltyContext({
        tenantId: input.tenantId,
        branchId: input.branchId,
        staffId: input.staffId,
        installmentId: input.installmentId,
        staffContext: input.staffContext,
        installments: this.installments,
        adjustments: this.adjustments,
        tenantSettings: this.tenantSettings,
        branches: this.branches,
        tx,
      });

      if (context.installment.version !== input.expectedVersion) {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment was updated by another user. Refresh and try again.',
          409,
        );
      }

      let penaltyAmountRial: bigint;

      if (input.mode === 'manual') {
        if (input.amountRial === undefined || input.amountRial <= 0n) {
          throw new ApplicationError(
            'VALIDATION_ERROR',
            'Manual penalty requires a positive amountRial.',
            400,
          );
        }

        penaltyAmountRial = input.amountRial;
      } else {
        await assertNoAutoPenaltyAppliedToday({
          adjustments: this.adjustments,
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          tx,
        });

        penaltyAmountRial = resolveAutoPenaltyAmount({
          installmentAmountRial: context.installment.amountRial,
          dueDate: context.installment.dueDate,
          settings: context.penaltySettings,
          existingPenaltyTotalRial: context.existingPenaltyTotalRial,
        });

        if (penaltyAmountRial <= 0n) {
          throw new ApplicationError(
            'PENALTY_AMOUNT_ZERO',
            'Calculated penalty is zero; nothing to apply.',
            400,
          );
        }
      }

      try {
        assertPenaltyWithinMax({
          penaltyAmountRial,
          existingPenaltyTotalRial: context.existingPenaltyTotalRial,
          maxRial: context.penaltySettings.penalty_max_rial,
        });
      } catch (error) {
        mapPenaltyMaxExceeded(error);
      }

      const previousSnapshot = installmentRecordToOperationSnapshot(context.installment);

      const adjustment = await this.adjustments.create(
        {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          adjustmentType: 'PENALTY',
          amountRial: penaltyAmountRial,
          reason,
          appliedById: input.staffId,
          createdById: input.staffId,
        },
        tx,
      );

      const updateResult = await this.installments.applyPenaltyAmount(
        {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          penaltyAmountRial,
          expectedVersion: input.expectedVersion,
          updatedById: input.staffId,
        },
        tx,
      );

      if (updateResult.outcome === 'not_found') {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
      }

      if (updateResult.outcome === 'status_invalid') {
        throw new ApplicationError(
          updateResult.status === 'PAID' || updateResult.status === 'WAIVED'
            ? 'INSTALLMENT_STATUS_INVALID'
            : 'INSTALLMENT_NOT_OVERDUE',
          updateResult.status === 'PAID' || updateResult.status === 'WAIVED'
            ? 'Penalty cannot be applied to paid or waived installments.'
            : 'Penalty can only be applied to overdue installments.',
          409,
        );
      }

      if (updateResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment was updated by another user. Refresh and try again.',
          409,
        );
      }

      const updatedInstallment = updateResult.installment;
      const newSnapshot = installmentRecordToOperationSnapshot(updatedInstallment);

      const operationLog = await this.operationLogs.append(
        {
          tenantId: input.tenantId,
          saleId: context.sale.id,
          operationType: 'penalty',
          installmentIds: [updatedInstallment.id],
          previousSnapshot: serializeOperationSnapshots([previousSnapshot]),
          newSnapshot: serializeOperationSnapshots([newSnapshot]),
          reason,
          performedById: input.staffId,
          createdById: input.staffId,
          metadata: {
            adjustmentId: adjustment.id,
            mode: input.mode,
            penaltyAmountRial: penaltyAmountRial.toString(),
          },
        },
        tx,
      );

      const remainingRial = await this.installments.syncSaleOutstandingRial(
        input.tenantId,
        context.sale.id,
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'installment.penalty',
          entityType: 'installment',
          entityId: updatedInstallment.id,
          newValue: {
            adjustmentId: adjustment.id,
            mode: input.mode,
            penaltyAmountRial: penaltyAmountRial.toString(),
            reason,
            newAmountRial: updatedInstallment.amountRial.toString(),
            remainingRial: remainingRial.toString(),
            version: updatedInstallment.version,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        adjustment: {
          id: adjustment.id,
          amountRial: penaltyAmountRial.toString(),
          reason,
          appliedAt: adjustment.appliedAt,
        },
        installment: {
          id: updatedInstallment.id,
          amountRial: updatedInstallment.amountRial.toString(),
          version: updatedInstallment.version,
        },
        remainingRial: remainingRial.toString(),
        operationLogId: operationLog.id,
      };
    });
  }
}
