import { PaymentAttemptDomainErrorCode } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { InstallmentRecord } from '../../ports/installment.repository.port.js';
import type {
  IPaymentAttemptRepository,
  PaymentAttemptRecord,
} from '../../ports/payment-attempt.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { ITenantRepository } from '../../ports/tenant.repository.port.js';
import type { TenantBrandingDto } from '@hivork/contracts/core';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';

export type PaymentReceiptContext = {
  attempt: PaymentAttemptRecord;
  installment: InstallmentRecord;
  sale: SaleRecord;
  customerName: string;
  customerPhone: string;
  confirmedByStaffName: string | null;
  tenantBranding: TenantBrandingDto;
};

export function assertReceiptEligibleAttempt(attempt: PaymentAttemptRecord): void {
  if (attempt.status === 'VOIDED') {
    throw new ApplicationError('PAYMENT_VOIDED', 'Payment attempt was voided.', 409);
  }

  if (attempt.status !== 'CONFIRMED') {
    throw new ApplicationError(
      PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
      'Only confirmed payment attempts can receive a receipt.',
      409,
    );
  }

  if (!attempt.confirmedAt) {
    throw new ApplicationError(
      PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
      'Only confirmed payment attempts can receive a receipt.',
      409,
    );
  }
}

export async function loadPaymentReceiptContext(input: {
  tenantId: string;
  branchId: string;
  staffId: string;
  paymentAttemptId: string;
  staffContext: DataScopeStaffContext;
  paymentAttempts: IPaymentAttemptRepository;
  installments: IInstallmentRepository;
  sales: ISaleRepository;
  staff: IStaffRepository;
  tenants: ITenantRepository;
  branches: IBranchReader;
}): Promise<PaymentReceiptContext> {
  await assertBranchAccess(input.tenantId, input.branchId, input.staffContext, input.branches);

  const attempt = await input.paymentAttempts.findById(input.tenantId, input.paymentAttemptId);
  if (!attempt) {
    throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
  }

  assertReceiptEligibleAttempt(attempt);

  const loaded = await input.installments.findByIdWithSale(input.tenantId, attempt.installmentId);
  if (!loaded) {
    throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
  }

  const { installment: installmentRecord, sale } = loaded;

  if (!isSaleInScope(sale as SaleRecord, input.staffId, input.staffContext)) {
    throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
  }

  if (sale.branchId !== input.branchId) {
    throw new ApplicationError(
      'BRANCH_ACCESS_DENIED',
      'Branch is not in scope for this payment.',
      403,
    );
  }

  const saleDetail = await input.sales.findDetailById(input.tenantId, sale.id);
  if (!saleDetail) {
    throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
  }

  const tenantDetail = await input.tenants.findDetailById(input.tenantId);
  const tenantRecord = tenantDetail ?? (await input.tenants.findById(input.tenantId));

  const tenantBranding: TenantBrandingDto = {
    name: tenantDetail?.name ?? tenantRecord?.name ?? 'Tenant',
    legalName: tenantDetail?.legalName ?? null,
    taxId: tenantDetail?.taxId ?? null,
    logoUrl: tenantDetail?.logoUrl ?? null,
  };

  let confirmedByStaffName: string | null = null;
  if (attempt.confirmedByStaffId) {
    const staffRecord = await input.staff.findActiveByIdForTenant(
      attempt.confirmedByStaffId,
      input.tenantId,
    );
    confirmedByStaffName = staffRecord?.name ?? null;
  }

  return {
    attempt,
    installment: installmentRecord,
    sale: sale as SaleRecord,
    customerName: saleDetail.customer.name?.trim() || 'مشتری',
    customerPhone: saleDetail.customer.phone,
    confirmedByStaffName,
    tenantBranding,
  };
}

async function assertBranchAccess(
  tenantId: string,
  branchId: string,
  staffContext: DataScopeStaffContext,
  branches: IBranchReader,
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

export function buildContractReference(sale: SaleRecord): string {
  if (sale.contractNumber?.trim()) {
    return sale.contractNumber.trim();
  }

  if (sale.title?.trim()) {
    return sale.title.trim();
  }

  return sale.invoiceNumber?.trim() || sale.id.slice(0, 8).toUpperCase();
}
