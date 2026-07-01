import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type {
  IOverdueReportRepository,
  OverdueReportRow,
  OverdueReportSort,
} from '../../ports/overdue-report.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { resolveSaleListScope } from '../sales/sale-data-scope.js';
import { startOfDayInTimezone, TEHRAN_TIMEZONE } from '../installments/tehran-day-range.js';
import {
  decodeOverdueReportCursor,
  encodeOverdueReportCursor,
} from './overdue-report-cursor.js';

export type ListOverdueReportInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  activeBranchId?: string;
  overdueDaysMin?: number;
  overdueDaysMax?: number;
  search?: string;
  minAmountRial?: bigint;
  sort?: OverdueReportSort;
  cursor?: string;
  limit: number;
};

export type ListOverdueReportOutput = {
  data: Array<{
    customerId: string;
    displayName: string | null;
    phone: string;
    overdueCount: number;
    totalOverdueRial: string;
    oldestDueDate: string;
    lastPaymentAt: string | null;
    botLinked: boolean;
  }>;
  meta: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

function mapRow(row: OverdueReportRow): ListOverdueReportOutput['data'][number] {
  return {
    customerId: row.customerId,
    displayName: row.displayName,
    phone: row.phone,
    overdueCount: row.overdueCount,
    totalOverdueRial: row.totalOverdueRial.toString(),
    oldestDueDate: row.oldestDueDate.toISOString(),
    lastPaymentAt: row.lastPaymentAt?.toISOString() ?? null,
    botLinked: row.botLinked,
  };
}

export class ListOverdueReportUseCase
  implements UseCase<ListOverdueReportInput, ListOverdueReportOutput>
{
  constructor(private readonly overdueReport: IOverdueReportRepository) {}

  async execute(input: ListOverdueReportInput): Promise<ListOverdueReportOutput> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    if (
      input.overdueDaysMin != null &&
      input.overdueDaysMax != null &&
      input.overdueDaysMin > input.overdueDaysMax
    ) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid overdue days range.', 400);
    }

    const scope = resolveSaleListScope(input.staffContext, input.actorId, {
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });

    const sort = input.sort ?? 'totalOverdueRial:desc';
    const cursorPayload = input.cursor
      ? decodeOverdueReportCursor(input.cursor, sort)
      : undefined;

    const result = await this.overdueReport.list(input.tenantId, {
      scope,
      search: input.search?.trim() || undefined,
      overdueDaysMin: input.overdueDaysMin,
      overdueDaysMax: input.overdueDaysMax,
      minAmountRial: input.minAmountRial,
      sort,
      cursor: cursorPayload,
      limit: input.limit,
      todayStart: startOfDayInTimezone(new Date(), TEHRAN_TIMEZONE),
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeOverdueReportCursor({
            sort,
            customerId: lastItem.customerId,
            totalOverdueRial: lastItem.totalOverdueRial.toString(),
            oldestDueDate: lastItem.oldestDueDate.toISOString(),
            displayName: lastItem.displayName,
          })
        : null;

    return {
      data: result.items.map(mapRow),
      meta: {
        hasMore: result.hasMore,
        nextCursor,
      },
    };
  }
}
