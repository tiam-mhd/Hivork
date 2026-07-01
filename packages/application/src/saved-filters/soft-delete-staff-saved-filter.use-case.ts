import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IStaffSavedFilterRepository } from '../ports/staff-saved-filter.repository.port.js';

export type SoftDeleteStaffSavedFilterInput = {
  tenantId: string;
  staffId: string;
  filterId: string;
  deleteReason?: string;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteStaffSavedFilterOutput = {
  id: string;
  deletedAt: Date;
};

export class SoftDeleteStaffSavedFilterUseCase
  implements UseCase<SoftDeleteStaffSavedFilterInput, SoftDeleteStaffSavedFilterOutput>
{
  constructor(
    private readonly repository: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: SoftDeleteStaffSavedFilterInput,
  ): Promise<SoftDeleteStaffSavedFilterOutput> {
    const existing = await this.repository.findActiveById(
      input.filterId,
      input.tenantId,
      input.staffId,
    );

    if (!existing) {
      const deleted = await this.repository.findDeletedById(
        input.filterId,
        input.tenantId,
        input.staffId,
      );
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Saved filter is already deleted.', 409);
      }

      throw new ApplicationError('SAVED_FILTER_NOT_FOUND', 'Saved filter was not found.', 404);
    }

    const deleted = await this.repository.softDelete({
      id: existing.id,
      tenantId: input.tenantId,
      staffId: input.staffId,
      deletedById: input.staffId,
      deleteReason: input.deleteReason,
    });

    if (!deleted.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Saved filter is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_filter.delete',
      entityType: 'staff_saved_filter',
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
