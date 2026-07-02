import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import type {
  GetTenantCustomerUseCase,
  GetTenantCustomerOutput,
} from './get-tenant-customer.use-case.js';

export type BlacklistTenantCustomerInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type BlacklistTenantCustomerOutput = GetTenantCustomerOutput;

export type UnblacklistTenantCustomerInput = Omit<BlacklistTenantCustomerInput, 'reason'> & {
  reason?: string;
};

export type UnblacklistTenantCustomerOutput = GetTenantCustomerOutput;

export class BlacklistTenantCustomerUseCase
  implements UseCase<BlacklistTenantCustomerInput, BlacklistTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
    private readonly getTenantCustomer: GetTenantCustomerUseCase,
  ) {}

  async execute(input: BlacklistTenantCustomerInput): Promise<BlacklistTenantCustomerOutput> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new ApplicationError(
        'REASON_REQUIRED',
        'A blacklist reason of at least 3 characters is required.',
        422,
      );
    }

    const customer = await this.tenantCustomers.findFullDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!customer) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(customer, input.staffContext, input.actorId, this.sales);

    if (customer.isBlacklisted) {
      return this.getTenantCustomer.execute({
        tenantId: input.tenantId,
        tenantCustomerId: customer.id,
        staffContext: input.staffContext,
      });
    }

    await this.unitOfWork.transaction(async (tx) => {
      try {
        await this.tenantCustomers.updateLink(
          {
            id: customer.id,
            tenantId: input.tenantId,
            version: customer.version,
            updatedById: input.actorId,
            isBlacklisted: true,
            blacklistReason: reason,
          },
          tx,
        );
      } catch (error) {
        throw mapDomainError(error);
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.actorId,
          action: 'customer.blacklist',
          entityType: 'tenant_customer',
          entityId: customer.id,
          oldValue: {
            isBlacklisted: false,
            blacklistReason: customer.blacklistReason,
          },
          newValue: {
            isBlacklisted: true,
            blacklistReason: reason,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
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

export class UnblacklistTenantCustomerUseCase
  implements UseCase<UnblacklistTenantCustomerInput, UnblacklistTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
    private readonly getTenantCustomer: GetTenantCustomerUseCase,
  ) {}

  async execute(input: UnblacklistTenantCustomerInput): Promise<UnblacklistTenantCustomerOutput> {
    const customer = await this.tenantCustomers.findFullDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!customer) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(customer, input.staffContext, input.actorId, this.sales);

    if (!customer.isBlacklisted) {
      return this.getTenantCustomer.execute({
        tenantId: input.tenantId,
        tenantCustomerId: customer.id,
        staffContext: input.staffContext,
      });
    }

    await this.unitOfWork.transaction(async (tx) => {
      try {
        await this.tenantCustomers.updateLink(
          {
            id: customer.id,
            tenantId: input.tenantId,
            version: customer.version,
            updatedById: input.actorId,
            isBlacklisted: false,
          },
          tx,
        );
      } catch (error) {
        throw mapDomainError(error);
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.actorId,
          action: 'customer.unblacklist',
          entityType: 'tenant_customer',
          entityId: customer.id,
          oldValue: {
            isBlacklisted: true,
            blacklistReason: customer.blacklistReason,
          },
          newValue: {
            isBlacklisted: false,
            blacklistReason: null,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
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
