import { calculatePenaltyPreview } from '@hivork/domain';

import { UseCase } from '../../core/use-case.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentAdjustmentRepository } from '../../ports/installment-adjustment.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { loadOverdueInstallmentPenaltyContext } from './penalty.helpers.js';

export type CalculatePenaltyPreviewInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  staffContext: DataScopeStaffContext;
};

export type CalculatePenaltyPreviewResult = {
  overdueDays: number;
  graceDays: number;
  chargeableDays: number;
  calculatedPenaltyRial: string;
  cappedByMax: boolean;
};

export class CalculatePenaltyPreviewUseCase
  implements UseCase<CalculatePenaltyPreviewInput, CalculatePenaltyPreviewResult>
{
  constructor(
    private readonly installments: IInstallmentRepository,
    private readonly adjustments: IInstallmentAdjustmentRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
  ) {}

  async execute(input: CalculatePenaltyPreviewInput): Promise<CalculatePenaltyPreviewResult> {
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
    });

    const preview = calculatePenaltyPreview({
      installmentAmountRial: context.installment.amountRial,
      dueDate: context.installment.dueDate,
      settings: context.penaltySettings,
      existingPenaltyTotalRial: context.existingPenaltyTotalRial,
    });

    return {
      overdueDays: preview.overdueDays,
      graceDays: preview.graceDays,
      chargeableDays: preview.chargeableDays,
      calculatedPenaltyRial: preview.calculatedPenaltyRial.toString(),
      cappedByMax: preview.cappedByMax,
    };
  }
}
