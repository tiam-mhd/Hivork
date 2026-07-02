import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';

export type BulkUntagCustomersInput = {
  tenantId: string;
  actorId: string;
  ids: string[];
  tag: string;
  staffContext: DataScopeStaffContext;
  /** When true, logs `undo.executed` for the original bulk tag action. */
  isUndo?: boolean;
  originalAction?: string;
  ip?: string;
  userAgent?: string;
};

export type BulkUntagCustomersOutput = {
  updatedCount: number;
  tag: string;
};

export class BulkUntagCustomersUseCase
  implements UseCase<BulkUntagCustomersInput, BulkUntagCustomersOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: BulkUntagCustomersInput): Promise<BulkUntagCustomersOutput> {
    const tag = input.tag.trim();
    if (!tag) {
      throw new ApplicationError('VALIDATION_ERROR', 'Tag is required.', 400);
    }

    const uniqueIds = [...new Set(input.ids)];
    let updatedCount = 0;

    for (const id of uniqueIds) {
      const record = await this.tenantCustomers.findDetailById(id, input.tenantId);
      if (!record) {
        continue;
      }

      await assertTenantCustomerInScope(
        record,
        input.staffContext,
        input.actorId,
        this.sales,
      );

      if (!record.tags.includes(tag)) {
        continue;
      }

      await this.tenantCustomers.updateLink({
        id: record.id,
        tenantId: input.tenantId,
        version: record.version,
        updatedById: input.actorId,
        tags: record.tags.filter((value) => value !== tag),
      });
      updatedCount += 1;
    }

    if (input.isUndo) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorId,
        action: 'undo.executed',
        entityType: input.originalAction ?? 'customer.bulk_tag',
        entityId: uniqueIds[0] ?? 'bulk',
        oldValue: { originalEntityIds: uniqueIds, tag },
        newValue: { updatedCount },
        ip: input.ip,
        userAgent: input.userAgent,
      });
    } else if (updatedCount > 0) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorId,
        action: 'customer.bulk_untag',
        entityType: 'tenant_customer',
        entityId: uniqueIds[0] ?? 'bulk',
        newValue: { tag, entityIds: uniqueIds, updatedCount },
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }

    return { updatedCount, tag };
  }
}
