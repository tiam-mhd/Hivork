import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  IStaffSavedFilterRepository,
  StaffSavedFilterRecord,
} from '../ports/staff-saved-filter.repository.port.js';

export type RestoreStaffSavedFilterInput = {
  tenantId: string;
  staffId: string;
  filterId: string;
  ip?: string;
  userAgent?: string;
};

export class RestoreStaffSavedFilterUseCase
  implements UseCase<RestoreStaffSavedFilterInput, StaffSavedFilterRecord>
{
  constructor(
    private readonly repository: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RestoreStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    const deleted = await this.repository.findDeletedById(
      input.filterId,
      input.tenantId,
      input.staffId,
    );

    if (!deleted) {
      const active = await this.repository.findActiveById(
        input.filterId,
        input.tenantId,
        input.staffId,
      );
      if (active) {
        throw new ApplicationError('NOT_DELETED', 'Saved filter is not deleted.', 409);
      }

      throw new ApplicationError('SAVED_FILTER_NOT_FOUND', 'Saved filter was not found.', 404);
    }

    const nameConflict = await this.repository.findActiveByName(
      input.tenantId,
      input.staffId,
      deleted.resourceKey,
      deleted.name,
    );

    if (nameConflict) {
      throw new ApplicationError(
        'SAVED_FILTER_NAME_EXISTS',
        'Another active filter uses this name. Rename before restore.',
        409,
        { field: 'name' },
      );
    }

    const restored = await this.repository.restore({
      id: deleted.id,
      tenantId: input.tenantId,
      staffId: input.staffId,
      restoredById: input.staffId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_filter.restore',
      entityType: 'staff_saved_filter',
      entityId: restored.id,
      oldValue: { deletedAt: deleted.deletedAt },
      newValue: { deletedAt: null, name: restored.name },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return restored;
  }
}
