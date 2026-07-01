import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { resolveSaleListScope } from '../sales/sale-data-scope.js';
import {
  decodeInstallmentCursor,
  encodeInstallmentCursor,
  type InstallmentListSort,
} from './installment-cursor.js';
import {
  mapInstallmentListItemToSummary,
  type InstallmentSummary,
} from './installment-summary.mapper.js';

export type ListInstallmentsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  cursor?: string;
  limit: number;
  sort: InstallmentListSort;
  status?: 'pending' | 'overdue' | 'paid' | 'waived';
  statuses?: Array<'pending' | 'overdue' | 'paid' | 'waived'>;
  activeSaleOnly?: boolean;
  includeTotalAmountRial?: boolean;
  overdueOnly?: boolean;
  overdueBefore?: Date;
  maxDueDate?: Date;
  branchId?: string;
  saleId?: string;
  tenantCustomerId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  activeBranchId?: string;
};

export type ListInstallmentsOutput = {
  data: InstallmentSummary[];
  meta: {
    total: number;
    hasNext: boolean;
    nextCursor: string | null;
    totalAmountRial?: string;
  };
};

const STATUS_TO_PRISMA = {
  pending: 'PENDING',
  overdue: 'OVERDUE',
  paid: 'PAID',
  waived: 'WAIVED',
} as const;

export class ListInstallmentsUseCase
  implements UseCase<ListInstallmentsInput, ListInstallmentsOutput>
{
  constructor(private readonly installments: IInstallmentRepository) {}

  async execute(input: ListInstallmentsInput): Promise<ListInstallmentsOutput> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const scope = resolveSaleListScope(input.staffContext, input.actorId, {
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });

    const cursorPayload = input.cursor
      ? decodeInstallmentCursor(input.cursor, input.sort)
      : undefined;

    const activeSaleOnly =
      input.activeSaleOnly ??
      (input.status === 'overdue' ||
        input.overdueOnly === true ||
        (input.statuses?.includes('overdue') ?? false));

    const result = await this.installments.list(input.tenantId, {
      cursor: cursorPayload
        ? {
            id: cursorPayload.id,
            dueDate: cursorPayload.dueDate ? new Date(cursorPayload.dueDate) : undefined,
            sequenceNumber: cursorPayload.sequenceNumber,
          }
        : undefined,
      limit: input.limit,
      sort: input.sort,
      status: input.status ? STATUS_TO_PRISMA[input.status] : undefined,
      statuses: input.statuses?.map((status) => STATUS_TO_PRISMA[status]),
      activeSaleOnly,
      includeTotalAmountRial: input.includeTotalAmountRial,
      overdueOnly: input.overdueOnly,
      overdueBefore: input.overdueBefore,
      maxDueDate: input.maxDueDate,
      branchIds: scope.branchIds,
      createdByStaffId: scope.createdByStaffId,
      saleId: input.saleId,
      tenantCustomerId: input.tenantCustomerId,
      search: input.search?.trim() || undefined,
      from: input.from,
      to: input.to,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeInstallmentCursor(
            input.sort,
            lastItem.installment.id,
            lastItem.installment.dueDate,
            lastItem.installment.sequenceNumber,
          )
        : null;

    return {
      data: result.items.map(mapInstallmentListItemToSummary),
      meta: {
        total: result.total,
        hasNext: result.hasMore,
        nextCursor,
        ...(result.totalAmountRial !== undefined
          ? { totalAmountRial: result.totalAmountRial.toString() }
          : {}),
      },
    };
  }
}
