import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  IStaffSavedViewRepository,
  StaffSavedViewRecord,
} from '../ports/staff-saved-view.repository.port.js';

export type RestoreStaffSavedViewInput = {
  tenantId: string;
  staffId: string;
  viewId: string;
  ip?: string;
  userAgent?: string;
};

export class RestoreStaffSavedViewUseCase
  implements UseCase<RestoreStaffSavedViewInput, StaffSavedViewRecord>
{
  constructor(
    private readonly repository: IStaffSavedViewRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RestoreStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    const deleted = await this.repository.findDeletedById(
      input.viewId,
      input.tenantId,
      input.staffId,
    );

    if (!deleted) {
      const active = await this.repository.findOwnedActiveById(
        input.viewId,
        input.tenantId,
        input.staffId,
      );
      if (active) {
        throw new ApplicationError('NOT_DELETED', 'Saved view is not deleted.', 409);
      }

      throw new ApplicationError('SAVED_VIEW_NOT_FOUND', 'Saved view was not found.', 404);
    }

    const nameConflict = await this.repository.findActiveByName(
      input.tenantId,
      input.staffId,
      deleted.resourceKey,
      deleted.name,
    );

    if (nameConflict) {
      throw new ApplicationError(
        'SAVED_VIEW_NAME_EXISTS',
        'Another active view uses this name. Rename before restore.',
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
      action: 'saved_view.restore',
      entityType: 'staff_saved_view',
      entityId: restored.id,
      oldValue: { deletedAt: deleted.deletedAt },
      newValue: { deletedAt: null, name: restored.name },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return restored;
  }
}
