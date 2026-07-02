import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerDetailRecord,
} from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';

export type ArchiveTenantCustomerInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ArchiveTenantCustomerOutput = TenantCustomerDetailRecord;

export type UnarchiveTenantCustomerInput = ArchiveTenantCustomerInput;

export type UnarchiveTenantCustomerOutput = TenantCustomerDetailRecord;

export class ArchiveTenantCustomerUseCase
  implements UseCase<ArchiveTenantCustomerInput, ArchiveTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ArchiveTenantCustomerInput): Promise<ArchiveTenantCustomerOutput> {
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
        throw new ApplicationError('RECORD_DELETED', 'Customer has been deleted.', 404);
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(existing, input.staffContext, input.actorId, this.sales);

    const before = await this.tenantCustomers.findDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    const updated = await this.tenantCustomers.archive({
      id: input.tenantCustomerId,
      tenantId: input.tenantId,
      archivedById: input.actorId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.archive',
      entityType: 'tenant_customer',
      entityId: input.tenantCustomerId,
      oldValue: {
        status: before?.status ?? 'active',
      },
      newValue: {
        status: updated.status,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }
}

export class UnarchiveTenantCustomerUseCase
  implements UseCase<UnarchiveTenantCustomerInput, UnarchiveTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UnarchiveTenantCustomerInput): Promise<UnarchiveTenantCustomerOutput> {
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
        throw new ApplicationError('RECORD_DELETED', 'Customer has been deleted.', 404);
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(existing, input.staffContext, input.actorId, this.sales);

    const before = await this.tenantCustomers.findDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    const updated = await this.tenantCustomers.unarchive({
      id: input.tenantCustomerId,
      tenantId: input.tenantId,
      unarchivedById: input.actorId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.unarchive',
      entityType: 'tenant_customer',
      entityId: input.tenantCustomerId,
      oldValue: {
        status: before?.status ?? 'archived',
      },
      newValue: {
        status: updated.status,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }
}
