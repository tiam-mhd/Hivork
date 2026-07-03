import type { InstallmentsSettingsDto } from '@hivork/contracts';
import {
  calculatePenaltyPreview,
  isSameTehranDay,
  tehranDateKey,
  type PenaltyCalculationSettings,
} from '@hivork/domain';

import type { OutboxTransaction } from '../../ports/outbox.port.js';
import { ApplicationError } from '../../errors/application.error.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentAdjustmentRepository } from '../../ports/installment-adjustment.repository.port.js';
import type { IInstallmentRepository, InstallmentRecord } from '../../ports/installment.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import { mergeInstallmentsSettings } from '../settings/merge-installments-settings.js';

export function toPenaltyCalculationSettings(
  settings: InstallmentsSettingsDto,
): PenaltyCalculationSettings {
  return {
    penalty_type: settings.penalty_type,
    penalty_rate_bps: settings.penalty_rate_bps,
    penalty_fixed_rial: BigInt(settings.penalty_fixed_rial),
    penalty_grace_days: settings.penalty_grace_days,
    penalty_max_rial: BigInt(settings.penalty_max_rial),
  };
}

export function assertInstallmentOverdue(status: string): void {
  if (status !== 'OVERDUE') {
    if (status === 'PAID' || status === 'WAIVED') {
      throw new ApplicationError(
        'INSTALLMENT_STATUS_INVALID',
        'Penalty cannot be applied to paid or waived installments.',
        409,
      );
    }

    throw new ApplicationError(
      'INSTALLMENT_NOT_OVERDUE',
      'Penalty can only be applied to overdue installments.',
      409,
    );
  }
}

export function assertSaleActive(status: string, archivedAt: Date | null): void {
  if (status !== 'ACTIVE' || archivedAt) {
    throw new ApplicationError(
      'SALE_NOT_ACTIVE',
      'Sale is not active for installment operations.',
      409,
    );
  }
}

export async function assertBranchAccess(
  branches: IBranchReader,
  tenantId: string,
  branchId: string,
  staffContext: DataScopeStaffContext,
): Promise<void> {
  const exists = await branches.existsActiveInTenant(tenantId, branchId);
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

export type LoadedOverdueInstallmentContext = {
  installment: InstallmentRecord;
  sale: {
    id: string;
    branchId: string;
    tenantCustomerId: string;
    status: string;
    archivedAt: Date | null;
    createdByStaffId: string;
  };
  penaltySettings: PenaltyCalculationSettings;
  existingPenaltyTotalRial: bigint;
};

export async function loadOverdueInstallmentPenaltyContext(input: {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  staffContext: DataScopeStaffContext;
  installments: IInstallmentRepository;
  adjustments: IInstallmentAdjustmentRepository;
  tenantSettings: ITenantSettingsRepository;
  branches: IBranchReader;
  tx?: OutboxTransaction;
}): Promise<LoadedOverdueInstallmentContext> {
  await assertBranchAccess(input.branches, input.tenantId, input.branchId, input.staffContext);

  const loaded = await input.installments.findByIdWithSale(
    input.tenantId,
    input.installmentId,
    input.tx,
  );

  if (!loaded) {
    throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
  }

  const { installment, sale } = loaded;

  if (!isSaleInScope(sale as SaleRecord, input.staffId, input.staffContext)) {
    throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
  }

  if (sale.branchId !== input.branchId) {
    throw new ApplicationError(
      'BRANCH_ACCESS_DENIED',
      'Branch is not in scope for this installment.',
      403,
    );
  }

  assertSaleActive(sale.status, sale.archivedAt);
  assertInstallmentOverdue(installment.status);

  const settingsRaw = await input.tenantSettings.findByModule(
    input.tenantId,
    'installments',
    input.tx,
  );
  const penaltySettings = toPenaltyCalculationSettings(mergeInstallmentsSettings(settingsRaw));
  const existingPenaltyTotalRial = await input.adjustments.sumActivePenaltyRialByInstallmentId(
    input.tenantId,
    input.installmentId,
    input.tx,
  );

  return {
    installment,
    sale,
    penaltySettings,
    existingPenaltyTotalRial,
  };
}

export function mapPenaltyMaxExceeded(error: unknown): never {
  if (error instanceof Error && error.message === 'PENALTY_MAX_EXCEEDED') {
    throw new ApplicationError(
      'PENALTY_MAX_EXCEEDED',
      'Penalty amount exceeds the configured maximum.',
      400,
    );
  }

  throw error;
}

export async function assertNoAutoPenaltyAppliedToday(input: {
  adjustments: IInstallmentAdjustmentRepository;
  tenantId: string;
  installmentId: string;
  now?: Date;
  tx?: OutboxTransaction;
}): Promise<void> {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const recent = await input.adjustments.listRecentPenaltiesByInstallmentId(
    input.tenantId,
    input.installmentId,
    since,
    input.tx,
  );

  const todayKey = tehranDateKey(now);
  const alreadyApplied = recent.some((row) => isSameTehranDay(row.appliedAt, now));

  if (alreadyApplied) {
    throw new ApplicationError(
      'PENALTY_ALREADY_APPLIED_TODAY',
      'Automatic penalty was already applied today for this installment.',
      409,
      { tehranDate: todayKey },
    );
  }
}

export function resolveAutoPenaltyAmount(input: {
  installmentAmountRial: bigint;
  dueDate: Date;
  settings: PenaltyCalculationSettings;
  existingPenaltyTotalRial: bigint;
  now?: Date;
}): bigint {
  const preview = calculatePenaltyPreview({
    installmentAmountRial: input.installmentAmountRial,
    dueDate: input.dueDate,
    settings: input.settings,
    existingPenaltyTotalRial: input.existingPenaltyTotalRial,
    now: input.now,
  });

  return preview.calculatedPenaltyRial;
}
