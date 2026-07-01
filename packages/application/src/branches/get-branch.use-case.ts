import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { BranchRecord, IBranchRepository } from '../ports/branch.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertBranchInScope } from './branch-data-scope.js';

export type GetBranchInput = {
  tenantId: string;
  branchId: string;
  staffContext: DataScopeStaffContext;
};

export type GetBranchOutput = BranchRecord;

export class GetBranchUseCase implements UseCase<GetBranchInput, GetBranchOutput> {
  constructor(private readonly branches: IBranchRepository) {}

  async execute(input: GetBranchInput): Promise<GetBranchOutput> {
    const branch = await this.branches.findActiveById(input.branchId, input.tenantId);
    if (!branch) {
      const deleted = await this.branches.findDeletedById(input.branchId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Branch has been deleted.', 404);
      }

      throw new ApplicationError('BRANCH_NOT_FOUND', 'Branch was not found for this tenant.', 404);
    }

    assertBranchInScope(branch.id, input.staffContext);

    return branch;
  }
}
