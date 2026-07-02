import { ApplicationError } from '../errors/application.error.js';
import type { FilterAst } from '@hivork/contracts/ui';
import { UseCase } from '../core/use-case.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerListItem,
  TenantCustomerListLinkStatusFilter,
  TenantCustomerListSort,
} from '../ports/tenant-customer.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import {
  buildCustomerListWhere,
  isCustomerSearchActionable,
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
  branchId?: string;
  categoryId?: string;
  isBlacklisted?: boolean;
  assignedStaffId?: string;
  linkStatus?: TenantCustomerListLinkStatusFilter;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  lastPurchaseAtFrom?: Date;
  lastPurchaseAtTo?: Date;
  includeArchived?: boolean;
  includeCount?: boolean;
  staffContext: DataScopeStaffContext;
};

export type ListTenantCustomersOutput = {
  data: TenantCustomerListItem[];
  meta: {
    total?: number;
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
  'creditScore:desc',
  'creditScore:asc',
  'totalPurchaseRial:desc',
  'totalPurchaseRial:asc',
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

    const branchId = input.branchId ?? input.defaultBranchId;
    if (branchId) {
      this.assertBranchDataScope(input.staffContext, branchId);
    }

    if (
      input.staffContext.dataScope === 'branch' &&
      resolveEffectiveBranchIds(input.staffContext).length === 0
    ) {
      return { data: [], meta: { hasNext: false, nextCursor: null } };
    }

    if (input.search?.trim() && !isCustomerSearchActionable(input.search)) {
      return { data: [], meta: { hasNext: false, nextCursor: null } };
    }

    const cursorPayload = input.cursor
      ? decodeTenantCustomerCursor(input.cursor, sort)
      : undefined;

    const listWhere = buildCustomerListWhere({
      tenantId: input.tenantId,
      search: input.search,
      filter: input.filter,
    });

    const result = await this.repository.listActive(input.tenantId, {
      limit,
      sort,
      listWhere,
      tags: input.tags?.length ? input.tags : undefined,
      status: input.status ?? 'active',
      branchId,
      categoryId: input.categoryId,
      isBlacklisted: input.isBlacklisted,
      assignedStaffId: input.assignedStaffId,
      linkStatus: input.linkStatus,
      createdAtFrom: input.createdAtFrom,
      createdAtTo: input.createdAtTo,
      lastPurchaseAtFrom: input.lastPurchaseAtFrom,
      lastPurchaseAtTo: input.lastPurchaseAtTo,
      includeArchived: input.includeArchived,
      includeCount: input.includeCount,
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
            creditScore: cursorPayload.creditScore,
            totalPurchaseRial:
              cursorPayload.totalPurchaseRial !== undefined
                ? BigInt(cursorPayload.totalPurchaseRial)
                : undefined,
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
            creditScore: lastItem.creditScore,
            totalPurchaseRial: lastItem.totalPurchaseRial,
          })
        : null;

    return {
      data: result.items,
      meta: {
        ...(result.total !== undefined ? { total: result.total } : {}),
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
