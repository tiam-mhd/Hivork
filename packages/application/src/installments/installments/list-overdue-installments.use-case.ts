import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  ListInstallmentsUseCase,
  type ListInstallmentsOutput,
} from './list-installments.use-case.js';
import type { InstallmentSummary } from './installment-summary.mapper.js';
import {
  endOfTehranDayCalendarDaysBefore,
  startOfDayInTimezone,
  TEHRAN_TIMEZONE,
} from './tehran-day-range.js';

export type ListOverdueInstallmentsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  activeBranchId?: string;
  minDaysOverdue?: number;
  cursor?: string;
  limit: number;
  sort?: 'dueDate:asc' | 'daysOverdue:desc';
};

export type ListOverdueInstallmentsOutput = {
  data: InstallmentSummary[];
  meta: {
    total: number;
    totalOutstandingRial: string;
    hasNext: boolean;
    nextCursor: string | null;
  };
};

export class ListOverdueInstallmentsUseCase
  implements UseCase<ListOverdueInstallmentsInput, ListOverdueInstallmentsOutput>
{
  constructor(private readonly listInstallments: ListInstallmentsUseCase) {}

  async execute(input: ListOverdueInstallmentsInput): Promise<ListOverdueInstallmentsOutput> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const now = new Date();
    const todayStart = startOfDayInTimezone(now, TEHRAN_TIMEZONE);
    const maxDueDate =
      input.minDaysOverdue != null && input.minDaysOverdue > 0
        ? endOfTehranDayCalendarDaysBefore(now, input.minDaysOverdue)
        : undefined;

    const result: ListInstallmentsOutput = await this.listInstallments.execute({
      tenantId: input.tenantId,
      actorId: input.actorId,
      staffContext: input.staffContext,
      cursor: input.cursor,
      limit: input.limit,
      sort: input.sort ?? 'daysOverdue:desc',
      activeSaleOnly: true,
      includeTotalAmountRial: true,
      overdueOnly: true,
      overdueBefore: todayStart,
      maxDueDate,
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });

    return {
      data: result.data,
      meta: {
        total: result.meta.total,
        totalOutstandingRial: result.meta.totalAmountRial ?? '0',
        hasNext: result.meta.hasNext,
        nextCursor: result.meta.nextCursor,
      },
    };
  }
}
