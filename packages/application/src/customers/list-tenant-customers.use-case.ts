import { ApplicationError } from '../errors/application.error.js';
import { normalizePhone } from '@hivork/contracts';
import type { FilterAst } from '@hivork/contracts/ui';
import { UseCase } from '../core/use-case.js';
import { buildListWhere } from '../core/list/build-list-where.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerListItem,
  TenantCustomerListSort,
} from '../ports/tenant-customer.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import {
  CUSTOMER_FILTER_FIELD_MAP,
  CUSTOMER_SEARCH_FIELDS,
} from './customer-list-query.config.js';
import {
  decodeTenantCustomerCursor,
  encodeTenantCustomerCursor,
} from './tenant-customer-cursor.js';

export type ListTenantCustomersInput = {
  tenantId: string;
  actorId: string;
  cursor?: string;
  limit?: number;
  sort?: TenantCustomerListSort;
  search?: string;
  filter?: FilterAst;
  tags?: string[];
  status?: 'active' | 'suspended';
  defaultBranchId?: string;
  staffContext: DataScopeStaffContext;
};

export type ListTenantCustomersOutput = {
  data: TenantCustomerListItem[];
  meta: {
    total: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
};

const ALLOWED_SORTS: TenantCustomerListSort[] = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'lastPurchaseAt:desc',
  'lastPurchaseAt:asc',
  'overdueCount:desc',
  'overdueCount:asc',
];

export class ListTenantCustomersUseCase
  implements UseCase<ListTenantCustomersInput, ListTenantCustomersOutput>
{
  constructor(private readonly repository: ITenantCustomerRepository) {}

  async execute(input: ListTenantCustomersInput): Promise<ListTenantCustomersOutput> {
    const limit = input.limit ?? 20;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const sort = input.sort ?? 'createdAt:desc';
    if (!ALLOWED_SORTS.includes(sort)) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid sort field.', 400);
    }

    if (input.defaultBranchId) {
      this.assertBranchDataScope(input.staffContext, input.defaultBranchId);
    }

    if (
      input.staffContext.dataScope === 'branch' &&
      resolveEffectiveBranchIds(input.staffContext).length === 0
    ) {
      return { data: [], meta: { total: 0, hasNext: false, nextCursor: null } };
    }

    const cursorPayload = input.cursor
      ? decodeTenantCustomerCursor(input.cursor, sort)
      : undefined;

    const listWhere = buildListWhere({
      tenantId: input.tenantId,
      search: input.search,
      searchFields: CUSTOMER_SEARCH_FIELDS,
      phoneNormalize: normalizePhone,
      filter: input.filter,
      fieldMap: CUSTOMER_FILTER_FIELD_MAP,
    });

    const result = await this.repository.listActive(input.tenantId, {
      limit,
      sort,
      listWhere,
      tags: input.tags?.length ? input.tags : undefined,
      status: input.status ?? 'active',
      defaultBranchId: input.defaultBranchId,
      cursor: cursorPayload
        ? {
            id: cursorPayload.id,
            createdAt: cursorPayload.createdAt ? new Date(cursorPayload.createdAt) : undefined,
            name: cursorPayload.name,
            lastPurchaseAt:
              cursorPayload.lastPurchaseAt === undefined
                ? undefined
                : cursorPayload.lastPurchaseAt
                  ? new Date(cursorPayload.lastPurchaseAt)
                  : null,
            overdueCount: cursorPayload.overdueCount,
          }
        : undefined,
      scope: this.buildScope(input.staffContext, input.actorId),
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeTenantCustomerCursor(sort, {
            id: lastItem.id,
            createdAt: lastItem.createdAt,
            globalCustomer: lastItem.globalCustomer,
            lastPurchaseAt: lastItem.lastPurchaseAt,
            overdueCount: lastItem.overdueCount,
          })
        : null;

    return {
      data: result.items,
      meta: {
        total: result.total,
        hasNext: result.hasMore,
        nextCursor,
      },
    };
  }

  private buildScope(staffContext: DataScopeStaffContext, actorId: string) {
    switch (staffContext.dataScope) {
      case 'all':
        return { dataScope: 'all' as const, actorId };
      case 'branch':
        return {
          dataScope: 'branch' as const,
          actorId,
          branchIds: resolveEffectiveBranchIds(staffContext),
        };
      case 'own':
        return { dataScope: 'own' as const, actorId };
    }
  }

  private assertBranchDataScope(ctx: DataScopeStaffContext, branchId: string): void {
    if (ctx.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(ctx);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'BRANCH_NOT_ALLOWED',
        'Branch is outside your data scope.',
        403,
      );
    }
  }
}
