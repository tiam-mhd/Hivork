import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { decodeSaleCursor, encodeSaleCursor, type SaleListSort } from './sale-cursor.js';
import { resolveSaleListScope } from './sale-data-scope.js';
import { mapSaleListItemToSummary, type SaleSummary } from './sale-summary.mapper.js';

export type ListSalesInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  cursor?: string;
  limit: number;
  sort: SaleListSort;
  status?: 'active' | 'completed' | 'cancelled';
  statuses?: Array<'active' | 'completed' | 'cancelled'>;
  branchId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  activeBranchId?: string;
};

export type ListSalesOutput = {
  data: SaleSummary[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

const STATUS_TO_PRISMA = {
  active: 'ACTIVE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
} as const;

export class ListSalesUseCase implements UseCase<ListSalesInput, ListSalesOutput> {
  constructor(private readonly sales: ISaleRepository) {}

  async execute(input: ListSalesInput): Promise<ListSalesOutput> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const scope = resolveSaleListScope(input.staffContext, input.actorId, {
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });

    const cursorPayload = input.cursor
      ? decodeSaleCursor(input.cursor, input.sort)
      : undefined;

    const prismaStatuses = input.statuses?.map((value) => STATUS_TO_PRISMA[value]);
    const singlePrismaStatus = input.status ? STATUS_TO_PRISMA[input.status] : undefined;

    const result = await this.sales.list(input.tenantId, {
      cursor: cursorPayload
        ? {
            createdAt: new Date(cursorPayload.createdAt),
            id: cursorPayload.id,
            contractDate: cursorPayload.contractDate
              ? new Date(cursorPayload.contractDate)
              : undefined,
          }
        : undefined,
      limit: input.limit,
      sort: input.sort,
      status: prismaStatuses ? undefined : singlePrismaStatus,
      statuses: prismaStatuses,
      branchIds: scope.branchIds,
      createdByStaffId: scope.createdByStaffId,
      search: input.search?.trim() || undefined,
      from: input.from,
      to: input.to,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeSaleCursor(
            input.sort,
            lastItem.sale.createdAt,
            lastItem.sale.id,
            lastItem.sale.contractDate,
          )
        : null;

    return {
      data: result.items.map(mapSaleListItemToSummary),
      meta: {
        nextCursor,
        hasMore: result.hasMore,
      },
    };
  }
}
