import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IStaffRepository, StaffRecord } from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from './staff-data-scope.js';

export type GetStaffInput = {
  tenantId: string;
  staffId: string;
  staffContext: DataScopeStaffContext;
};

export type GetStaffOutput = StaffRecord;

export class GetStaffUseCase implements UseCase<GetStaffInput, GetStaffOutput> {
  constructor(private readonly staff: IStaffRepository) {}

  async execute(input: GetStaffInput): Promise<GetStaffOutput> {
    const record = await this.staff.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!record) {
      const deleted = await this.staff.findDeletedByIdForTenant(input.staffId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Staff has been deleted.', 404);
      }

      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    assertStaffInScope(record, input.staffContext);

    return record;
  }
}
