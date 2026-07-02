import {
  assertCustomerOwnershipTransferAllowed,
  buildCustomerOwnershipTransferFields,
  CustomerOwnershipTransferredEvent,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IOutboxPublisher } from '../ports/outbox.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from '../staff/staff-data-scope.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import type {
  GetTenantCustomerUseCase,
  GetTenantCustomerOutput,
} from './get-tenant-customer.use-case.js';

export type TransferCustomerOwnershipInput = {
  tenantId: string;
  tenantCustomerId: string;
  newStaffId: string;
  note?: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type TransferCustomerOwnershipOutput = GetTenantCustomerOutput;

export class TransferCustomerOwnershipUseCase
  implements UseCase<TransferCustomerOwnershipInput, TransferCustomerOwnershipOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly staff: IStaffRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
    private readonly getTenantCustomer: GetTenantCustomerUseCase,
  ) {}

  async execute(input: TransferCustomerOwnershipInput): Promise<TransferCustomerOwnershipOutput> {
    const customer = await this.tenantCustomers.findFullDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!customer) {
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

    await assertTenantCustomerInScope(customer, input.staffContext, input.actorId, this.sales);

    try {
      assertCustomerOwnershipTransferAllowed({
        currentAssignedStaffId: customer.assignedStaffId,
        targetAssignedStaffId: input.newStaffId,
        status: customer.status,
        existingMetadata: customer.metadata,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const newStaff = await this.staff.findActiveByIdForTenant(input.newStaffId, input.tenantId);
    if (!newStaff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Assigned staff was not found.', 422);
    }

    if (newStaff.status === 'suspended') {
      throw new ApplicationError(
        'STAFF_INACTIVE',
        'Target staff is not active.',
        422,
      );
    }

    assertStaffInScope(newStaff, input.staffContext);

    const transferredAt = new Date();
    const transferFields = buildCustomerOwnershipTransferFields(
      {
        currentAssignedStaffId: customer.assignedStaffId,
        targetAssignedStaffId: input.newStaffId,
        status: customer.status,
        existingMetadata: customer.metadata,
      },
      {
        actorStaffId: input.actorId,
        transferredAt,
        note: input.note,
      },
    );

    const oldStaffId = customer.assignedStaffId;

    await this.unitOfWork.transaction(async (tx) => {
      await this.tenantCustomers.updateLink(
        {
          id: customer.id,
          tenantId: input.tenantId,
          version: customer.version,
          updatedById: input.actorId,
          assignedStaffId: transferFields.assignedStaffId,
          metadata: transferFields.metadata,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.actorId,
          action: 'customer.transfer',
          entityType: 'tenant_customer',
          entityId: customer.id,
          oldValue: { assignedStaffId: oldStaffId },
          newValue: {
            assignedStaffId: input.newStaffId,
            note: input.note?.trim() || null,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      await this.outbox.publish(
        new CustomerOwnershipTransferredEvent(customer.id, {
          tenantCustomerId: customer.id,
          fromStaffId: oldStaffId,
          toStaffId: input.newStaffId,
          byStaffId: input.actorId,
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        }),
        { tenantId: input.tenantId, aggregateType: 'tenant_customer' },
        tx,
      );
    });

    return this.getTenantCustomer.execute({
      tenantId: input.tenantId,
      tenantCustomerId: customer.id,
      staffContext: input.staffContext,
    });
  }
}
