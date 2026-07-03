import { MergeSplitPolicy } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../ports/installment.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sales/sale-data-scope.js';
import {
  buildRegeneratePlan,
  type RegeneratePlan,
  type RegenerateScheduleInput,
} from './regenerate-installments.planner.js';
import type { RegenerateRoundingPolicy } from '@hivork/domain';

export type PreviewRegenerateInstallmentsInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  saleId: string;
  schedule: RegenerateScheduleInput;
  roundingPolicy: RegenerateRoundingPolicy;
  staffContext: DataScopeStaffContext;
};

export type PreviewRegenerateInstallmentsResult = {
  saleId: string;
  removedInstallmentIds: string[];
  newInstallments: Array<{
    sequenceNumber: number;
    dueDate: Date;
    amountRial: bigint;
    status: 'pending';
  }>;
  totalAmountRial: bigint;
};

function mapPlanToPreview(plan: RegeneratePlan): PreviewRegenerateInstallmentsResult {
  return {
    saleId: plan.saleId,
    removedInstallmentIds: plan.removedInstallmentIds,
    newInstallments: plan.newInstallments.map((item) => ({
      sequenceNumber: item.sequenceNumber,
      dueDate: item.dueDate,
      amountRial: item.amountRial,
      status: 'pending',
    })),
    totalAmountRial: plan.totalAmountRial,
  };
}

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

export class PreviewRegenerateInstallmentsUseCase
  implements UseCase<PreviewRegenerateInstallmentsInput, PreviewRegenerateInstallmentsResult>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
  ) {}

  async execute(
    input: PreviewRegenerateInstallmentsInput,
  ): Promise<PreviewRegenerateInstallmentsResult> {
    await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

    const sale = await this.sales.findById(input.tenantId, input.saleId);
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

    const [installments, maxSequenceNumber, settings] = await Promise.all([
      this.installments.findBySaleId(input.tenantId, input.saleId),
      this.installments.getMaxSequenceNumber(input.tenantId, input.saleId),
      this.tenantSettings.findByModule(input.tenantId, 'installments'),
    ]);

    const plan = buildRegeneratePlan({
      sale,
      installments,
      schedule: input.schedule,
      roundingPolicy: input.roundingPolicy,
      policy: resolveMergeSplitPolicy(settings),
      maxSequenceNumber,
    });

    return mapPlanToPreview(plan);
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
