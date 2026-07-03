import { MergeSplitPolicy } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IInstallmentOperationLogRepository } from '../ports/installment-operation-log.repository.port.js';
import type { IInstallmentRepository } from '../ports/installment.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sales/sale-data-scope.js';
import {
  buildRegeneratePlan,
  type RegenerateScheduleInput,
} from './regenerate-installments.planner.js';
import type { RegenerateRoundingPolicy } from '@hivork/domain';

export type RegenerateInstallmentsInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  saleId: string;
  reason: string;
  schedule: RegenerateScheduleInput;
  roundingPolicy: RegenerateRoundingPolicy;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RegenerateInstallmentsResult = {
  saleId: string;
  removedInstallmentIds: string[];
  newInstallments: Array<{
    id: string;
    sequenceNumber: number;
    dueDate: Date;
    amountRial: bigint;
    status: 'pending';
  }>;
  totalAmountRial: bigint;
  operationLogId: string;
};

function resolveMergeSplitPolicy(settings: Record<string, unknown>): MergeSplitPolicy {
  return MergeSplitPolicy.fromSettings({
    split_min_part_rial:
      typeof settings.split_min_part_rial === 'string' ? settings.split_min_part_rial : undefined,
    rounding_mode:
      typeof settings.rounding_mode === 'string'
        ? (settings.rounding_mode as 'none' | 'floor' | 'ceil' | 'nearest')
        : undefined,
    rounding_unit_rial:
      typeof settings.rounding_unit_rial === 'string' ? settings.rounding_unit_rial : undefined,
  });
}

export class RegenerateInstallmentsUseCase
  implements UseCase<RegenerateInstallmentsInput, RegenerateInstallmentsResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly operationLogs: IInstallmentOperationLogRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RegenerateInstallmentsInput): Promise<RegenerateInstallmentsResult> {
    const trimmedReason = input.reason.trim();
    if (trimmedReason.length < 3) {
      throw new ApplicationError('FIELD_REQUIRED', 'Regenerate reason is required.', 400);
    }

    return this.unitOfWork.transaction(async (tx) => {
      await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

      const sale = await this.sales.findById(input.tenantId, input.saleId, tx);
      if (!sale || sale.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      if (!isSaleInScope(sale, input.staffId, input.staffContext)) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      if (sale.branchId !== input.branchId) {
        throw new ApplicationError(
          'BRANCH_ACCESS_DENIED',
          'Branch is not in scope for this sale.',
          403,
        );
      }

      const installments = await this.installments.findBySaleId(input.tenantId, input.saleId, tx);
      const maxSequenceNumber = await this.installments.getMaxSequenceNumber(
        input.tenantId,
        input.saleId,
        tx,
      );
      const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments', tx);

      const plan = buildRegeneratePlan({
        sale,
        installments,
        schedule: input.schedule,
        roundingPolicy: input.roundingPolicy,
        policy: resolveMergeSplitPolicy(settings),
        maxSequenceNumber,
      });

      const deletedCount = await this.installments.softDeleteForRegenerate(
        {
          tenantId: input.tenantId,
          installmentIds: plan.removedInstallmentIds,
          deletedById: input.staffId,
          deleteReason: 'regenerate',
        },
        tx,
      );

      if (deletedCount !== plan.removedInstallmentIds.length) {
        throw new ApplicationError(
          'INSTALLMENT_NOT_FOUND',
          'One or more installments could not be regenerated.',
          404,
        );
      }

      const created = await this.installments.saveMany(
        plan.newInstallments.map((item) => ({
          id: item.id,
          saleId: input.saleId,
          tenantId: input.tenantId,
          sequenceNumber: item.sequenceNumber,
          dueDate: item.dueDate,
          amountRial: item.amountRial,
          status: item.status,
          createdById: input.staffId,
        })),
        tx,
      );

      const operationLog = await this.operationLogs.append(
        {
          tenantId: input.tenantId,
          saleId: input.saleId,
          operationType: 'regenerate',
          installmentIds: [...plan.removedInstallmentIds, ...created.map((item) => item.id)],
          previousSnapshot: plan.removedSnapshots,
          newSnapshot: plan.newSnapshots,
          reason: trimmedReason,
          performedById: input.staffId,
          createdById: input.staffId,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'installment.regenerate',
          entityType: 'sale',
          entityId: input.saleId,
          oldValue: {
            removedInstallmentIds: plan.removedInstallmentIds,
            totalAmountRial: plan.totalAmountRial.toString(),
          },
          newValue: {
            newInstallmentIds: created.map((item) => item.id),
            totalAmountRial: plan.totalAmountRial.toString(),
            reason: trimmedReason,
            operationLogId: operationLog.id,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        saleId: input.saleId,
        removedInstallmentIds: plan.removedInstallmentIds,
        newInstallments: created.map((item) => ({
          id: item.id,
          sequenceNumber: item.sequenceNumber,
          dueDate: item.dueDate,
          amountRial: item.amountRial,
          status: 'pending',
        })),
        totalAmountRial: plan.totalAmountRial,
        operationLogId: operationLog.id,
      };
    });
  }

  private async assertBranchAccess(
    tenantId: string,
    branchId: string,
    staffContext: DataScopeStaffContext,
  ): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError(
        'BRANCH_ACCESS_DENIED',
        'Branch is not available for this tenant.',
        403,
      );
    }

    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'BRANCH_ACCESS_DENIED',
        'Branch is not assigned to this staff.',
        403,
      );
    }
  }
}
