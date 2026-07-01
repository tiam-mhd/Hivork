import type { ColumnPersonalization } from '@hivork/contracts/ui';

import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IStaffSavedFilterRepository } from '../ports/staff-saved-filter.repository.port.js';
import type {
  IStaffSavedViewRepository,
  StaffSavedViewRecord,
} from '../ports/staff-saved-view.repository.port.js';

export type UpdateStaffSavedViewInput = {
  tenantId: string;
  staffId: string;
  viewId: string;
  name?: string;
  description?: string | null;
  columnState?: ColumnPersonalization;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  search?: string | null;
  savedFilterId?: string | null;
  isDefault?: boolean;
  visibility?: 'private' | 'shared';
  version: number;
  ip?: string;
  userAgent?: string;
};

export class UpdateStaffSavedViewUseCase
  implements UseCase<UpdateStaffSavedViewInput, StaffSavedViewRecord>
{
  constructor(
    private readonly repository: IStaffSavedViewRepository,
    private readonly savedFilters: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    const existing = await this.repository.findOwnedActiveById(
      input.viewId,
      input.tenantId,
      input.staffId,
    );
 
    if (!existing) {
      throw new ApplicationError('SAVED_VIEW_NOT_FOUND', 'Saved view was not found.', 404);
    }

    if (existing.version !== input.version) {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Saved view was modified by another session.',
        409,
      );
    }

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await this.repository.findActiveByName(
          input.tenantId,
          input.staffId,
          existing.resourceKey,
          trimmedName,
        );

        if (duplicate && duplicate.id !== existing.id) {
          throw new ApplicationError(
            'SAVED_VIEW_NAME_EXISTS',
            'A saved view with this name already exists.',
            409,
            { field: 'name' },
          );
        }
      }
    }

    if (input.savedFilterId) {
      const filter = await this.savedFilters.findActiveById(
        input.savedFilterId,
        input.tenantId,
        input.staffId,
      );

      if (!filter) {
        throw new ApplicationError(
          'SAVED_FILTER_NOT_FOUND',
          'Referenced saved filter was not found.',
          400,
        );
      }
    }

    let savedFilterId = input.savedFilterId;
    if (input.visibility === 'shared' && existing.savedFilterId) {
      const linkedFilter = await this.savedFilters.findActiveById(
        existing.savedFilterId,
        input.tenantId,
        input.staffId,
      );

      if (linkedFilter && linkedFilter.visibility !== 'shared') {
        const sharedFilter = await this.savedFilters.create({
          tenantId: input.tenantId,
          staffId: input.staffId,
          resourceKey: linkedFilter.resourceKey,
          name: `${linkedFilter.name} (shared ${Date.now()})`,
          description: linkedFilter.description,
          filterAst: linkedFilter.filterAst,
          isDefault: false,
          visibility: 'shared',
          createdById: input.staffId,
        });
        savedFilterId = sharedFilter.id;
      }
    }

    let updated: StaffSavedViewRecord;
    try {
      updated = await this.repository.update({
        id: existing.id,
        tenantId: input.tenantId,
        staffId: input.staffId,
        name: input.name?.trim(),
        description: input.description,
        columnState: input.columnState,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
        search: input.search,
        savedFilterId,
        isDefault: input.isDefault,
        visibility: input.visibility,
        version: input.version,
        updatedById: input.staffId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Saved view was modified by another session.',
          409,
        );
      }
      throw error;
    }

    const auditAction =
      input.visibility !== undefined && input.visibility !== existing.visibility
        ? input.visibility === 'shared'
          ? 'saved_view.share'
          : 'saved_view.unshare'
        : 'saved_view.update';

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: auditAction,
      entityType: 'staff_saved_view',
      entityId: updated.id,
      oldValue: {
        name: existing.name,
        isDefault: existing.isDefault,
        visibility: existing.visibility,
        version: existing.version,
      },
      newValue: {
        name: updated.name,
        isDefault: updated.isDefault,
        visibility: updated.visibility,
        version: updated.version,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }
}
