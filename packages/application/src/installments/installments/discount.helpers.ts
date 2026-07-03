import type { InstallmentsSettingsDto } from '@hivork/contracts';
import { type DiscountValidationSettings } from '@hivork/domain';

import type { OutboxTransaction } from '../../ports/outbox.port.js';
import { ApplicationError } from '../../errors/application.error.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository, InstallmentRecord } from '../../ports/installment.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import { mergeInstallmentsSettings } from '../settings/merge-installments-settings.js';
import { assertBranchAccess, assertSaleActive } from './penalty.helpers.js';

export function toDiscountValidationSettings(
  settings: InstallmentsSettingsDto,
): DiscountValidationSettings {
  return {
    discount_max_percent_bps: settings.discount_max_percent_bps,
    min_installment_rial: BigInt(settings.min_installment_rial),
  };
}

export function assertInstallmentDiscountable(status: string): void {
  if (status === 'PENDING' || status === 'OVERDUE') {
    return;
  }

  if (status === 'PAID' || status === 'WAIVED') {
    throw new ApplicationError(
      'INSTALLMENT_STATUS_INVALID',
      'Discount cannot be applied to paid or waived installments.',
      409,
    );
  }

  throw new ApplicationError(
    'INSTALLMENT_STATUS_INVALID',
    'Discount can only be applied to pending or overdue installments.',
    409,
  );
}

export type LoadedDiscountableInstallmentContext = {
  installment: InstallmentRecord;
  sale: {
    id: string;
    branchId: string;
    tenantCustomerId: string;
    status: string;
    archivedAt: Date | null;
    createdByStaffId: string;
  };
  discountSettings: DiscountValidationSettings;
};

export async function loadDiscountableInstallmentContext(input: {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  staffContext: DataScopeStaffContext;
  installments: IInstallmentRepository;
  tenantSettings: ITenantSettingsRepository;
  branches: IBranchReader;
  tx?: OutboxTransaction;
}): Promise<LoadedDiscountableInstallmentContext> {
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
  assertInstallmentDiscountable(installment.status);

  const settingsRaw = await input.tenantSettings.findByModule(
    input.tenantId,
    'installments',
    input.tx,
  );

  return {
    installment,
    sale,
    discountSettings: toDiscountValidationSettings(mergeInstallmentsSettings(settingsRaw)),
  };
}

export function mapDiscountValidationError(error: unknown): never {
  if (!(error instanceof Error)) {
    throw error;
  }

  switch (error.message) {
    case 'DISCOUNT_EXCEEDS_AMOUNT':
      throw new ApplicationError(
        'DISCOUNT_EXCEEDS_AMOUNT',
        'Discount amount exceeds the installment amount.',
        400,
      );
    case 'INSTALLMENT_AMOUNT_TOO_LOW':
      throw new ApplicationError(
        'INSTALLMENT_AMOUNT_TOO_LOW',
        'Installment amount would fall below the configured minimum after discount.',
        400,
      );
    case 'DISCOUNT_MAX_EXCEEDED':
      throw new ApplicationError(
        'DISCOUNT_MAX_EXCEEDED',
        'Discount exceeds the configured maximum percentage.',
        400,
      );
    case 'DISCOUNT_MUST_BE_POSITIVE':
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Discount amount must be positive.',
        400,
      );
    default:
      throw error;
  }
}
