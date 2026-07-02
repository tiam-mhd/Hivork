import type {
  ListActiveTenantCustomersOptions,
  TenantCustomerListLinkStatusFilter,
  TenantCustomerListScope,
} from '@hivork/application';
import type { Prisma } from '@prisma/client';

export function buildTenantCustomerScopeWhere(
  scope: TenantCustomerListScope,
): Prisma.TenantCustomerWhereInput | undefined {
  switch (scope.dataScope) {
    case 'all':
      return undefined;
    case 'branch':
      if (!scope.branchIds?.length) {
        return { id: { in: [] } };
      }

      return {
        OR: [
          { defaultBranchId: { in: scope.branchIds } },
          {
            sales: {
              some: {
                deletedAt: null,
                branchId: { in: scope.branchIds },
              },
            },
          },
        ],
      };
    case 'own':
      return {
        sales: {
          some: {
            deletedAt: null,
            createdByStaffId: scope.actorId,
          },
        },
      };
  }
}

export function buildTenantCustomerBranchFilterWhere(
  branchId: string,
): Prisma.TenantCustomerWhereInput {
  return {
    OR: [
      { defaultBranchId: branchId },
      {
        sales: {
          some: {
            deletedAt: null,
            branchId,
          },
        },
      },
    ],
  };
}

export function buildTenantCustomerLinkStatusWhere(
  linkStatus: TenantCustomerListLinkStatusFilter,
): Prisma.TenantCustomerWhereInput {
  switch (linkStatus) {
    case 'active':
      return { archivedAt: null, isBlacklisted: false };
    case 'archived':
      return { archivedAt: { not: null } };
    case 'blacklisted':
      return { isBlacklisted: true };
    case 'deleted':
      return { deletedAt: { not: null } };
    default: {
      const exhaustive: never = linkStatus;
      return exhaustive;
    }
  }
}

export function buildTenantCustomerDateRangeWhere(
  options: Pick<
    ListActiveTenantCustomersOptions,
    'createdAtFrom' | 'createdAtTo' | 'lastPurchaseAtFrom' | 'lastPurchaseAtTo'
  >,
): Prisma.TenantCustomerWhereInput | undefined {
  const clauses: Prisma.TenantCustomerWhereInput[] = [];

  if (options.createdAtFrom || options.createdAtTo) {
    clauses.push({
      createdAt: {
        ...(options.createdAtFrom ? { gte: options.createdAtFrom } : {}),
        ...(options.createdAtTo ? { lte: options.createdAtTo } : {}),
      },
    });
  }

  if (options.lastPurchaseAtFrom || options.lastPurchaseAtTo) {
    clauses.push({
      lastPurchaseAt: {
        ...(options.lastPurchaseAtFrom ? { gte: options.lastPurchaseAtFrom } : {}),
        ...(options.lastPurchaseAtTo ? { lte: options.lastPurchaseAtTo } : {}),
      },
    });
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

export function buildTenantCustomerCursorWhere(
  options: ListActiveTenantCustomersOptions,
): Prisma.TenantCustomerWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { id, createdAt, name, lastPurchaseAt, overdueCount, creditScore, totalPurchaseRial } =
    options.cursor;

  switch (options.sort) {
    case 'createdAt:desc':
      return {
        OR: [{ createdAt: { lt: createdAt! } }, { createdAt: createdAt!, id: { lt: id } }],
      };
    case 'createdAt:asc':
      return {
        OR: [{ createdAt: { gt: createdAt! } }, { createdAt: createdAt!, id: { gt: id } }],
      };
    case 'name:desc':
      return {
        OR: [
          { globalCustomer: { name: { lt: name ?? '', mode: 'insensitive' } } },
          {
            globalCustomer: { name: name ?? '' },
            id: { lt: id },
          },
        ],
      };
    case 'name:asc':
      return {
        OR: [
          { globalCustomer: { name: { gt: name ?? '', mode: 'insensitive' } } },
          {
            globalCustomer: { name: name ?? '' },
            id: { gt: id },
          },
        ],
      };
    case 'lastPurchaseAt:desc':
      if (lastPurchaseAt === null || lastPurchaseAt === undefined) {
        return {
          OR: [{ lastPurchaseAt: { not: null } }, { lastPurchaseAt: null, id: { lt: id } }],
        };
      }

      return {
        OR: [{ lastPurchaseAt: { lt: lastPurchaseAt } }, { lastPurchaseAt, id: { lt: id } }],
      };
    case 'lastPurchaseAt:asc':
      if (lastPurchaseAt === null || lastPurchaseAt === undefined) {
        return {
          OR: [{ lastPurchaseAt: { not: null } }, { lastPurchaseAt: null, id: { gt: id } }],
        };
      }

      return {
        OR: [{ lastPurchaseAt: { gt: lastPurchaseAt } }, { lastPurchaseAt, id: { gt: id } }],
      };
    case 'overdueCount:desc':
      return {
        OR: [
          { overdueCount: { lt: overdueCount! } },
          { overdueCount: overdueCount!, id: { lt: id } },
        ],
      };
    case 'overdueCount:asc':
      return {
        OR: [
          { overdueCount: { gt: overdueCount! } },
          { overdueCount: overdueCount!, id: { gt: id } },
        ],
      };
    case 'creditScore:desc':
      return {
        OR: [
          { creditScore: { lt: creditScore! } },
          { creditScore: creditScore!, id: { lt: id } },
        ],
      };
    case 'creditScore:asc':
      return {
        OR: [
          { creditScore: { gt: creditScore! } },
          { creditScore: creditScore!, id: { gt: id } },
        ],
      };
    case 'totalPurchaseRial:desc':
      return {
        OR: [
          { totalPurchaseRial: { lt: totalPurchaseRial! } },
          { totalPurchaseRial: totalPurchaseRial!, id: { lt: id } },
        ],
      };
    case 'totalPurchaseRial:asc':
      return {
        OR: [
          { totalPurchaseRial: { gt: totalPurchaseRial! } },
          { totalPurchaseRial: totalPurchaseRial!, id: { gt: id } },
        ],
      };
    default: {
      const exhaustive: never = options.sort;
      return exhaustive;
    }
  }
}

export function buildTenantCustomerListOrderBy(
  sort: ListActiveTenantCustomersOptions['sort'],
): Prisma.TenantCustomerOrderByWithRelationInput[] {
  switch (sort) {
    case 'createdAt:asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'name:asc':
      return [{ globalCustomer: { name: 'asc' } }, { id: 'asc' }];
    case 'name:desc':
      return [{ globalCustomer: { name: 'desc' } }, { id: 'desc' }];
    case 'lastPurchaseAt:asc':
      return [{ lastPurchaseAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
    case 'lastPurchaseAt:desc':
      return [{ lastPurchaseAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
    case 'overdueCount:asc':
      return [{ overdueCount: 'asc' }, { id: 'asc' }];
    case 'overdueCount:desc':
      return [{ overdueCount: 'desc' }, { id: 'desc' }];
    case 'creditScore:asc':
      return [{ creditScore: 'asc' }, { id: 'asc' }];
    case 'creditScore:desc':
      return [{ creditScore: 'desc' }, { id: 'desc' }];
    case 'totalPurchaseRial:asc':
      return [{ totalPurchaseRial: 'asc' }, { id: 'asc' }];
    case 'totalPurchaseRial:desc':
      return [{ totalPurchaseRial: 'desc' }, { id: 'desc' }];
    case 'createdAt:desc':
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

export function buildTenantCustomerListWhere(
  tenantId: string,
  options: ListActiveTenantCustomersOptions,
): Prisma.TenantCustomerWhereInput {
  const andFilters: Prisma.TenantCustomerWhereInput[] = [];
  const scopeWhere = buildTenantCustomerScopeWhere(options.scope);

  if (scopeWhere) {
    andFilters.push(scopeWhere);
  }

  if (options.listWhere) {
    andFilters.push(options.listWhere as Prisma.TenantCustomerWhereInput);
  } else if (options.search) {
    andFilters.push({
      OR: [
        { globalCustomer: { name: { contains: options.search.trim(), mode: 'insensitive' } } },
        { globalCustomer: { user: { phone: { contains: options.search.trim() } } } },
        { localCode: { contains: options.search.trim(), mode: 'insensitive' } },
      ],
    });
  }

  if (options.tags?.length) {
    andFilters.push({ tags: { hasEvery: options.tags } });
  }

  if (options.ids?.length) {
    andFilters.push({ id: { in: options.ids } });
  }

  if (options.categoryId) {
    andFilters.push({ categoryId: options.categoryId });
  }

  if (options.isBlacklisted !== undefined) {
    andFilters.push({ isBlacklisted: options.isBlacklisted });
  }

  if (options.assignedStaffId) {
    andFilters.push({ assignedStaffId: options.assignedStaffId });
  }

  if (options.linkStatus) {
    andFilters.push(buildTenantCustomerLinkStatusWhere(options.linkStatus));
  }

  if (options.branchId) {
    andFilters.push(buildTenantCustomerBranchFilterWhere(options.branchId));
  }

  const dateRangeWhere = buildTenantCustomerDateRangeWhere(options);
  if (dateRangeWhere) {
    andFilters.push(dateRangeWhere);
  }

  const cursorWhere = buildTenantCustomerCursorWhere(options);
  if (cursorWhere) {
    andFilters.push(cursorWhere);
  }

  const includeDeleted = options.linkStatus === 'deleted';
  const excludeArchived =
    !options.includeArchived &&
    options.linkStatus !== 'archived' &&
    options.linkStatus !== 'deleted';

  return {
    tenantId,
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(excludeArchived ? { archivedAt: null } : {}),
    ...(options.status === 'suspended'
      ? { globalCustomer: { status: 'suspended', deletedAt: null } }
      : { globalCustomer: { status: 'active', deletedAt: null } }),
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  };
}
