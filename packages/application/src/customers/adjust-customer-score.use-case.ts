import { resolveManualScoreAdjustment } from '@hivork/domain';

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

export type AdjustCustomerScoreInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  delta?: number;
  newScore?: number;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type AdjustCustomerScoreOutput = GetTenantCustomerOutput;

export class AdjustCustomerScoreUseCase
  implements UseCase<AdjustCustomerScoreInput, AdjustCustomerScoreOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
    private readonly getTenantCustomer: GetTenantCustomerUseCase,
  ) {}

  async execute(input: AdjustCustomerScoreInput): Promise<AdjustCustomerScoreOutput> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new ApplicationError(
        'REASON_REQUIRED',
        'A reason of at least 3 characters is required for score adjustment.',
        422,
      );
    }

    if (input.delta === undefined && input.newScore === undefined) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Either delta or newScore must be provided.',
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

    if (customer.status === 'archived') {
      throw new ApplicationError(
        'CUSTOMER_ARCHIVED',
        'Archived customers cannot be updated.',
        409,
      );
    }

    let nextScore: number;
    try {
      nextScore = resolveManualScoreAdjustment(customer.creditScore, {
        delta: input.delta,
        newScore: input.newScore,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    if (nextScore === customer.creditScore) {
      return this.getTenantCustomer.execute({
        tenantId: input.tenantId,
        tenantCustomerId: customer.id,
        staffContext: input.staffContext,
      });
    }

    await this.unitOfWork.transaction(async (tx) => {
      await this.tenantCustomers.updateLink(
        {
          id: customer.id,
          tenantId: input.tenantId,
          version: customer.version,
          updatedById: input.actorId,
          creditScore: nextScore,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.actorId,
          action: 'customer.score.adjust',
          entityType: 'tenant_customer',
          entityId: customer.id,
          oldValue: {
            creditScore: customer.creditScore,
          },
          newValue: {
            creditScore: nextScore,
            reason,
            delta: input.delta ?? null,
            newScore: input.newScore ?? null,
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
