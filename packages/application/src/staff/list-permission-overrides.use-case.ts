import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IPermissionOverrideRepository } from '../ports/permission-override.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from './staff-data-scope.js';

export type ListPermissionOverridesInput = {
  tenantId: string;
  staffId: string;
  staffContext: DataScopeStaffContext;
};

export type PermissionOverrideListItem = {
  id: string;
  staffId: string;
  permission: string;
  effect: 'grant' | 'deny';
  reason: string;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
};

export type ListPermissionOverridesOutput = {
  data: PermissionOverrideListItem[];
};

export class ListPermissionOverridesUseCase
  implements UseCase<ListPermissionOverridesInput, ListPermissionOverridesOutput>
{
  constructor(
    private readonly staff: IStaffRepository,
    private readonly overrides: IPermissionOverrideRepository,
  ) {}

  async execute(input: ListPermissionOverridesInput): Promise<ListPermissionOverridesOutput> {
    const staffRecord = await this.staff.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staffRecord) {
      const deleted = await this.staff.findDeletedByIdForTenant(input.staffId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Staff has been deleted.', 404);
      }

      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    assertStaffInScope(staffRecord, input.staffContext);

    const rows = await this.overrides.listActiveByStaff(staffRecord.id, input.tenantId);

    return {
      data: rows.map((row) => ({
        id: row.id,
        staffId: row.staffId,
        permission: row.permission,
        effect: row.effect,
        reason: row.reason,
        expiresAt: row.expiresAt,
        createdById: row.createdById,
        createdAt: row.createdAt,
      })),
    };
  }
}
