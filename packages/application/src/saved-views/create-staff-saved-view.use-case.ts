import type { ColumnPersonalization } from '@hivork/contracts/ui';

import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IStaffSavedFilterRepository } from '../ports/staff-saved-filter.repository.port.js';
import type {
  IStaffSavedViewRepository,
  StaffSavedViewRecord,
} from '../ports/staff-saved-view.repository.port.js';
import { MAX_SAVED_VIEWS_PER_STAFF } from './saved-view.constants.js';

export type CreateStaffSavedViewInput = {
  tenantId: string;
  staffId: string;
  resourceKey: string;
  name: string;
  description?: string;
  columnState: ColumnPersonalization;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  savedFilterId?: string;
  isDefault?: boolean;
  visibility?: 'private' | 'shared';
  ip?: string;
  userAgent?: string;
};

export class CreateStaffSavedViewUseCase
  implements UseCase<CreateStaffSavedViewInput, StaffSavedViewRecord>
{
  constructor(
    private readonly repository: IStaffSavedViewRepository,
    private readonly savedFilters: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    const trimmedName = input.name.trim();
    const activeCount = await this.repository.countActive(
      input.tenantId,
      input.staffId,
      input.resourceKey,
    );

    if (activeCount >= MAX_SAVED_VIEWS_PER_STAFF) {
      throw new ApplicationError(
        'PLAN_LIMIT_EXCEEDED',
        'Saved view limit reached for this resource.',
        403,
      );
    }

    const duplicate = await this.repository.findActiveByName(
      input.tenantId,
      input.staffId,
      input.resourceKey,
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

    const created = await this.repository.create({
      tenantId: input.tenantId,
      staffId: input.staffId,
      resourceKey: input.resourceKey,
      name: trimmedName,
      description: input.description?.trim() || null,
      columnState: input.columnState,
      sortBy: input.sortBy ?? null,
      sortDir: input.sortDir ?? null,
      search: input.search?.trim() || null,
      savedFilterId: input.savedFilterId ?? null,
      isDefault: input.isDefault ?? false,
      visibility: input.visibility ?? 'private',
      createdById: input.staffId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_view.create',
      entityType: 'staff_saved_view',
      entityId: created.id,
      newValue: {
        name: created.name,
        resourceKey: created.resourceKey,
        isDefault: created.isDefault,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return created;
  }
}
