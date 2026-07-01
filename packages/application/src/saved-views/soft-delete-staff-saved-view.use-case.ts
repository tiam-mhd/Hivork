import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IStaffSavedViewRepository } from '../ports/staff-saved-view.repository.port.js';

export type SoftDeleteStaffSavedViewInput = {
  tenantId: string;
  staffId: string;
  viewId: string;
  deleteReason?: string;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteStaffSavedViewOutput = {
  id: string;
  deletedAt: Date;
};

export class SoftDeleteStaffSavedViewUseCase
  implements UseCase<SoftDeleteStaffSavedViewInput, SoftDeleteStaffSavedViewOutput>
{
  constructor(
    private readonly repository: IStaffSavedViewRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: SoftDeleteStaffSavedViewInput,
  ): Promise<SoftDeleteStaffSavedViewOutput> {
    const existing = await this.repository.findOwnedActiveById(
      input.viewId,
      input.tenantId,
      input.staffId,
    );

    if (!existing) {
      const deleted = await this.repository.findDeletedById(
        input.viewId,
        input.tenantId,
        input.staffId,
      );
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Saved view is already deleted.', 409);
      }

      throw new ApplicationError('SAVED_VIEW_NOT_FOUND', 'Saved view was not found.', 404);
    }

    const deleted = await this.repository.softDelete({
      id: existing.id,
      tenantId: input.tenantId,
      staffId: input.staffId,
      deletedById: input.staffId,
      deleteReason: input.deleteReason,
    });

    if (!deleted.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Saved view is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_view.delete',
      entityType: 'staff_saved_view',
      entityId: existing.id,
      oldValue: { name: existing.name, resourceKey: existing.resourceKey },
      newValue: {
        deletedAt: deleted.deletedAt,
        deletedById: deleted.deletedById,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { id: deleted.id, deletedAt: deleted.deletedAt };
  }
}
