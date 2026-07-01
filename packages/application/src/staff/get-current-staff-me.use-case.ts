import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IStaffRepository, StaffRecord } from '../ports/staff.repository.port.js';
import { GetStaffPermissionsUseCase } from '../rbac/get-staff-permissions.use-case.js';

export type GetCurrentStaffMeInput = {
  staffId: string;
  tenantId: string;
  activeBranchId: string | null;
};

export type GetCurrentStaffMeOutput = {
  staff: StaffRecord;
  permissions: string[];
  activeBranchId: string | null;
};

export class GetCurrentStaffMeUseCase
  implements UseCase<GetCurrentStaffMeInput, GetCurrentStaffMeOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly getStaffPermissions: GetStaffPermissionsUseCase,
  ) {}

  async execute(input: GetCurrentStaffMeInput): Promise<GetCurrentStaffMeOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    if (staff.status === 'suspended') {
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    const permissions = await this.getStaffPermissions.execute({ staffId: input.staffId });

    return {
      staff,
      permissions: [...permissions].sort(),
      activeBranchId: input.activeBranchId,
    };
  }
}
