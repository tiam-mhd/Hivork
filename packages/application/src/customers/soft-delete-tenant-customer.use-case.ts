import { mergeInstallmentsSettings } from '../installments/settings/merge-installments-settings.js';
import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import { maskCustomerAuditRecord } from './customer-audit-mask.js';

export type SoftDeleteTenantCustomerInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  deleteReason?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteTenantCustomerOutput = {
  id: string;
  deletedAt: Date;
};

export class SoftDeleteTenantCustomerUseCase
  implements UseCase<SoftDeleteTenantCustomerInput, SoftDeleteTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly settings: ITenantSettingsRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteTenantCustomerInput): Promise<SoftDeleteTenantCustomerOutput> {
    const existing = await this.tenantCustomers.findActiveById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!existing) {
      const deleted = await this.tenantCustomers.findDeletedById(
        input.tenantCustomerId,
        input.tenantId,
      );
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Customer is already deleted.', 409);
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(existing, input.staffContext, input.actorId, this.sales);

    await this.assertNoBlockingActiveSales(input.tenantId, input.tenantCustomerId);

    const beforeDetail = await this.tenantCustomers.findDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    const updated = await this.unitOfWork.transaction(async (tx) =>
      this.tenantCustomers.softDelete(
        {
          id: input.tenantCustomerId,
          tenantId: input.tenantId,
          deletedById: input.actorId,
          deleteReason: input.deleteReason,
        },
        tx,
      ),
    );

    if (!updated.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Customer is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.delete',
      entityType: 'tenant_customer',
      entityId: input.tenantCustomerId,
      oldValue: maskCustomerAuditRecord({
        deletedAt: null,
        localCode: beforeDetail?.localCode ?? null,
        notes: beforeDetail?.notes ?? null,
      }),
      newValue: maskCustomerAuditRecord({
        deletedAt: updated.deletedAt,
        deletedById: updated.deletedById,
        deleteReason: updated.deleteReason,
      }),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { id: updated.id, deletedAt: updated.deletedAt };
  }

  private async assertNoBlockingActiveSales(
    tenantId: string,
    tenantCustomerId: string,
  ): Promise<void> {
    const stored = await this.settings.findByModule(tenantId, 'installments');
    const installmentsSettings = mergeInstallmentsSettings(stored);

    if (!installmentsSettings.block_customer_delete_with_active_sales) {
      return;
    }

    const summary = await this.sales.getSalesSummaryForTenantCustomer(tenantId, tenantCustomerId, {
      dataScope: 'all',
      actorId: '',
    });

    if (summary.activeSalesCount > 0) {
      throw new ApplicationError(
        'CUSTOMER_HAS_ACTIVE_SALES',
        'Customer has active sales and cannot be deleted.',
        409,
        { activeSalesCount: summary.activeSalesCount },
      );
    }
  }
}
