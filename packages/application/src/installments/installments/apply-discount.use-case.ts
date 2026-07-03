import { validateDiscount } from '@hivork/domain';

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
  loadDiscountableInstallmentContext,
  mapDiscountValidationError,
} from './discount.helpers.js';

export type ApplyDiscountInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  discountRial: bigint;
  reason: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ApplyDiscountResult = {
  installment: {
    id: string;
    amountRial: string;
    version: number;
  };
  adjustment: {
    id: string;
    adjustmentType: 'discount';
    amountRial: string;
  };
  remainingRial: string;
  operationLogId: string;
};

export class ApplyDiscountUseCase implements UseCase<ApplyDiscountInput, ApplyDiscountResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly adjustments: IInstallmentAdjustmentRepository,
    private readonly operationLogs: IInstallmentOperationLogRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ApplyDiscountInput): Promise<ApplyDiscountResult> {
    const reason = input.reason.trim();

    return this.unitOfWork.transaction(async (tx) => {
      const context = await loadDiscountableInstallmentContext({
        tenantId: input.tenantId,
        branchId: input.branchId,
        staffId: input.staffId,
        installmentId: input.installmentId,
        staffContext: input.staffContext,
        installments: this.installments,
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

      try {
        validateDiscount({
          currentAmountRial: context.installment.amountRial,
          discountRial: input.discountRial,
          settings: context.discountSettings,
        });
      } catch (error) {
        mapDiscountValidationError(error);
      }

      const previousSnapshot = installmentRecordToOperationSnapshot(context.installment);

      const adjustment = await this.adjustments.create(
        {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          adjustmentType: 'DISCOUNT',
          amountRial: input.discountRial,
          reason,
          appliedById: input.staffId,
          createdById: input.staffId,
        },
        tx,
      );

      const updateResult = await this.installments.applyDiscountAmount(
        {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          discountAmountRial: input.discountRial,
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
          'INSTALLMENT_STATUS_INVALID',
          'Discount cannot be applied to paid or waived installments.',
          409,
        );
      }

      if (updateResult.outcome === 'amount_invalid') {
        throw new ApplicationError(
          'DISCOUNT_EXCEEDS_AMOUNT',
          'Discount amount exceeds the installment amount.',
          400,
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
          operationType: 'discount',
          installmentIds: [updatedInstallment.id],
          previousSnapshot: serializeOperationSnapshots([previousSnapshot]),
          newSnapshot: serializeOperationSnapshots([newSnapshot]),
          reason,
          performedById: input.staffId,
          createdById: input.staffId,
          metadata: {
            adjustmentId: adjustment.id,
            discountRial: input.discountRial.toString(),
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
          action: 'installment.discount',
          entityType: 'installment',
          entityId: updatedInstallment.id,
          newValue: {
            adjustmentId: adjustment.id,
            discountRial: input.discountRial.toString(),
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
        installment: {
          id: updatedInstallment.id,
          amountRial: updatedInstallment.amountRial.toString(),
          version: updatedInstallment.version,
        },
        adjustment: {
          id: adjustment.id,
          adjustmentType: 'discount',
          amountRial: input.discountRial.toString(),
        },
        remainingRial: remainingRial.toString(),
        operationLogId: operationLog.id,
      };
    });
  }
}
