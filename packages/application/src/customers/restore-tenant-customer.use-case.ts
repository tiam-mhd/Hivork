import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerDetailRecord,
} from '../ports/tenant-customer.repository.port.js';

export type RestoreTenantCustomerInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  ip?: string;
  userAgent?: string;
};

export type RestoreTenantCustomerOutput = {
  customer: TenantCustomerDetailRecord;
  restoredAt: Date;
};

export class RestoreTenantCustomerUseCase
  implements UseCase<RestoreTenantCustomerInput, RestoreTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RestoreTenantCustomerInput): Promise<RestoreTenantCustomerOutput> {
    const deleted = await this.tenantCustomers.findDeletedById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!deleted) {
      const active = await this.tenantCustomers.findActiveById(
        input.tenantCustomerId,
        input.tenantId,
      );
      if (active) {
        throw new ApplicationError('NOT_DELETED', 'Customer is not deleted.', 409);
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await this.tenantCustomers.restore({
      id: input.tenantCustomerId,
      tenantId: input.tenantId,
      restoredById: input.actorId,
    });

    const detail = await this.tenantCustomers.findDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );
    if (!detail) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found after restore.',
        404,
      );
    }

    const restoredAt = new Date();

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.restore',
      entityType: 'tenant_customer',
      entityId: input.tenantCustomerId,
      oldValue: {
        deletedAt: deleted.deletedAt,
        deletedById: deleted.deletedById,
        deleteReason: deleted.deleteReason,
      },
      newValue: { deletedAt: null, deletedById: null, deleteReason: null },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { customer: detail, restoredAt };
  }
}
