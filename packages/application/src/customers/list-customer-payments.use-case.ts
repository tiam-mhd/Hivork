import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type {
  CustomerPaymentListRecord,
  ICustomerPaymentsRepository,
} from '../ports/customer-payments.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveEffectiveBranchIds } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import {
  decodeCustomerPaymentCursor,
  encodeCustomerPaymentCursor,
} from './customer-payment-cursor.js';
import type { CustomerPaymentStatus } from '../ports/customer-payments.repository.port.js';

export type ListCustomerPaymentsInput = {
  tenantId: string;
  tenantCustomerId: string;
  limit?: number;
  cursor?: string;
  status?: CustomerPaymentStatus;
  occurredFrom?: string;
  occurredTo?: string;
  staffContext: DataScopeStaffContext;
};

export type ListCustomerPaymentsOutput = {
  items: CustomerPaymentListRecord[];
  summary: {
    totalPaidRial: bigint;
    pendingCount: number;
  };
  meta: {
    hasNext: boolean;
    nextCursor: string | null;
  };
};

export class ListCustomerPaymentsUseCase
  implements UseCase<ListCustomerPaymentsInput, ListCustomerPaymentsOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly payments: ICustomerPaymentsRepository,
  ) {}

  async execute(input: ListCustomerPaymentsInput): Promise<ListCustomerPaymentsOutput> {
    const limit = Math.min(input.limit ?? 20, 50);

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

    await assertTenantCustomerInScope(
      customer,
      input.staffContext,
      input.staffContext.staffId,
      this.sales,
    );

    const cursor = input.cursor ? decodeCustomerPaymentCursor(input.cursor) : undefined;
    const occurredFrom = input.occurredFrom ? new Date(input.occurredFrom) : undefined;
    const occurredTo = input.occurredTo ? new Date(input.occurredTo) : undefined;

    if (occurredFrom && Number.isNaN(occurredFrom.getTime())) {
      throw new ApplicationError('VALIDATION_ERROR', 'occurredFrom is invalid.', 422);
    }
    if (occurredTo && Number.isNaN(occurredTo.getTime())) {
      throw new ApplicationError('VALIDATION_ERROR', 'occurredTo is invalid.', 422);
    }

    const scope = this.buildScope(input.staffContext);
    const queryBase = {
      tenantId: input.tenantId,
      tenantCustomerId: input.tenantCustomerId,
      status: input.status,
      occurredFrom,
      occurredTo,
      scope,
    };

    const [rows, summary] = await Promise.all([
      this.payments.listByCustomer({
        ...queryBase,
        limit: limit + 1,
        cursor: cursor
          ? {
              sortAt: new Date(cursor.sortAt),
              id: cursor.id,
            }
          : undefined,
      }),
      this.payments.summarizeByCustomer({
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        occurredFrom,
        occurredTo,
        scope,
      }),
    ]);

    const hasNext = rows.length > limit;
    const pageItems = hasNext ? rows.slice(0, limit) : rows;
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems,
      summary,
      meta: {
        hasNext,
        nextCursor:
          hasNext && lastItem
            ? encodeCustomerPaymentCursor({
                sortAt: lastItem.sortAt,
                id: lastItem.paymentId,
              })
            : null,
      },
    };
  }

  private buildScope(staffContext: DataScopeStaffContext) {
    switch (staffContext.dataScope) {
      case 'all':
        return { dataScope: 'all' as const };
      case 'branch':
        return {
          dataScope: 'branch' as const,
          branchIds: resolveEffectiveBranchIds(staffContext),
        };
      case 'own':
        return {
          dataScope: 'own' as const,
          staffId: staffContext.staffId,
        };
    }
  }
}
