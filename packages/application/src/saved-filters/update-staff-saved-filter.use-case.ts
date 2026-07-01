import type { FilterAst } from '@hivork/contracts/ui';

import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  IStaffSavedFilterRepository,
  StaffSavedFilterRecord,
} from '../ports/staff-saved-filter.repository.port.js';

export type UpdateStaffSavedFilterInput = {
  tenantId: string;
  staffId: string;
  filterId: string;
  name?: string;
  description?: string | null;
  filterAst?: FilterAst;
  isDefault?: boolean;
  version: number;
  ip?: string;
  userAgent?: string;
};

export class UpdateStaffSavedFilterUseCase
  implements UseCase<UpdateStaffSavedFilterInput, StaffSavedFilterRecord>
{
  constructor(
    private readonly repository: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    const existing = await this.repository.findActiveById(
      input.filterId,
      input.tenantId,
      input.staffId,
    );

    if (!existing) {
      throw new ApplicationError('SAVED_FILTER_NOT_FOUND', 'Saved filter was not found.', 404);
    }

    if (existing.version !== input.version) {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Saved filter was modified by another session.',
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
            'SAVED_FILTER_NAME_EXISTS',
            'A saved filter with this name already exists.',
            409,
            { field: 'name' },
          );
        }
      }
    }

    let updated: StaffSavedFilterRecord;
    try {
      updated = await this.repository.update({
        id: existing.id,
        tenantId: input.tenantId,
        staffId: input.staffId,
        name: input.name?.trim(),
        description: input.description,
        filterAst: input.filterAst,
        isDefault: input.isDefault,
        version: input.version,
        updatedById: input.staffId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Saved filter was modified by another session.',
          409,
        );
      }
      throw error;
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_filter.update',
      entityType: 'staff_saved_filter',
      entityId: updated.id,
      oldValue: {
        name: existing.name,
        isDefault: existing.isDefault,
        version: existing.version,
      },
      newValue: {
        name: updated.name,
        isDefault: updated.isDefault,
        version: updated.version,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }
}
