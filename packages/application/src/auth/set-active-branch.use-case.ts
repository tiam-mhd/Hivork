import { Staff } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IStaffActiveBranchStore } from '../ports/staff-active-branch.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';

export type SetActiveBranchInput = {
  staffId: string;
  branchId: string | null;
};

export type SetActiveBranchOutput = {
  activeBranchId: string | null;
};

export class SetActiveBranchUseCase
  implements UseCase<SetActiveBranchInput, SetActiveBranchOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly activeBranchStore: IStaffActiveBranchStore,
    private readonly sessionTtlSeconds: number,
  ) {}

  async execute(input: SetActiveBranchInput): Promise<SetActiveBranchOutput> {
    const record = await this.staffRepository.findContextById(input.staffId);
    if (!record) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff account not found.', 404);
    }

    const staff = new Staff(
      record.id,
      record.tenantId,
      record.phone,
      record.name,
      record.status,
      record.dataScope,
      record.assignedBranchIds,
      record.primaryBranchId,
    );

    if (input.branchId !== null && !staff.canAccessBranch(input.branchId)) {
      throw new ApplicationError('BRANCH_NOT_ALLOWED', 'Branch is not assigned to this staff.', 403);
    }

    await this.activeBranchStore.set(record.id, input.branchId, this.sessionTtlSeconds);

    return { activeBranchId: input.branchId };
  }
}
