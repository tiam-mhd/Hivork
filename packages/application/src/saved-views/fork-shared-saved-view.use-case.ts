import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IStaffSavedFilterRepository } from '../ports/staff-saved-filter.repository.port.js';
import type {
  IStaffSavedViewRepository,
  StaffSavedViewRecord,
} from '../ports/staff-saved-view.repository.port.js';

export type ForkSharedSavedViewInput = {
  tenantId: string;
  staffId: string;
  viewId: string;
  name: string;
  ip?: string;
  userAgent?: string;
};

export class ForkSharedSavedViewUseCase
  implements UseCase<ForkSharedSavedViewInput, StaffSavedViewRecord>
{
  constructor(
    private readonly repository: IStaffSavedViewRepository,
    private readonly savedFilters: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ForkSharedSavedViewInput): Promise<StaffSavedViewRecord> {
    const source = await this.repository.findAccessibleById(input.viewId, input.tenantId, input.staffId);

    if (!source || source.visibility !== 'shared' || source.staffId === input.staffId) {
      throw new ApplicationError('SAVED_VIEW_NOT_FOUND', 'Shared view was not found.', 404);
    }

    const trimmedName = input.name.trim();
    const duplicate = await this.repository.findActiveByName(
      input.tenantId,
      input.staffId,
      source.resourceKey,
      trimmedName,
    );

    if (duplicate) {
      throw new ApplicationError(
        'SAVED_VIEW_NAME_EXISTS',
        'A saved view with this name already exists.',
        409,
        { field: 'name' },
      );
    }

    let savedFilterId: string | null = null;
    if (source.filterAst) {
      const copiedFilter = await this.savedFilters.create({
        tenantId: input.tenantId,
        staffId: input.staffId,
        resourceKey: source.resourceKey,
        name: `${trimmedName} filter`,
        description: `Forked from shared view ${source.name}`,
        filterAst: source.filterAst,
        isDefault: false,
        visibility: 'private',
        createdById: input.staffId,
      });
      savedFilterId = copiedFilter.id;
    }

    const created = await this.repository.create({
      tenantId: input.tenantId,
      staffId: input.staffId,
      resourceKey: source.resourceKey,
      name: trimmedName,
      description: source.description,
      columnState: source.columnState,
      sortBy: source.sortBy,
      sortDir: source.sortDir,
      search: source.search,
      savedFilterId,
      isDefault: false,
      visibility: 'private',
      createdById: input.staffId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_view.fork',
      entityType: 'staff_saved_view',
      entityId: created.id,
      oldValue: { sourceViewId: source.id, sourceOwnerId: source.staffId },
      newValue: { name: created.name, visibility: created.visibility },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return created;
  }
}
