import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  ListInstallmentsUseCase,
  type ListInstallmentsOutput,
} from './list-installments.use-case.js';
import { getTehranTodayUtcRange } from './tehran-day-range.js';
import type { InstallmentSummary } from './installment-summary.mapper.js';

export type ListTodayDueInstallmentsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  activeBranchId?: string;
  search?: string;
  cursor?: string;
  limit: number;
};

export type ListTodayDueInstallmentsOutput = {
  data: InstallmentSummary[];
  meta: {
    total: number;
    totalAmountRial: string;
    hasNext: boolean;
    nextCursor: string | null;
  };
};

export class ListTodayDueInstallmentsUseCase
  implements UseCase<ListTodayDueInstallmentsInput, ListTodayDueInstallmentsOutput>
{
  constructor(private readonly listInstallments: ListInstallmentsUseCase) {}

  async execute(input: ListTodayDueInstallmentsInput): Promise<ListTodayDueInstallmentsOutput> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const { from, to } = getTehranTodayUtcRange();

    const result: ListInstallmentsOutput = await this.listInstallments.execute({
      tenantId: input.tenantId,
      actorId: input.actorId,
      staffContext: input.staffContext,
      cursor: input.cursor,
      limit: input.limit,
      sort: 'dueDate:asc',
      statuses: ['pending', 'overdue'],
      activeSaleOnly: true,
      includeTotalAmountRial: true,
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
      search: input.search?.trim() || undefined,
      from,
      to,
    });

    return {
      data: result.data,
      meta: {
        total: result.meta.total,
        totalAmountRial: result.meta.totalAmountRial ?? '0',
        hasNext: result.meta.hasNext,
        nextCursor: result.meta.nextCursor,
      },
    };
  }
}
