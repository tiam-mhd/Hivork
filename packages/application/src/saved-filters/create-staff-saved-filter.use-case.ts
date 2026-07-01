import type { FilterAst } from '@hivork/contracts/ui';

import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  IStaffSavedFilterRepository,
  StaffSavedFilterRecord,
} from '../ports/staff-saved-filter.repository.port.js';
import { MAX_SAVED_FILTERS_PER_STAFF } from './saved-filter.constants.js';

export type CreateStaffSavedFilterInput = {
  tenantId: string;
  staffId: string;
  resourceKey: string;
  name: string;
  description?: string;
  filterAst: FilterAst;
  isDefault?: boolean;
  ip?: string;
  userAgent?: string;
};

export class CreateStaffSavedFilterUseCase
  implements UseCase<CreateStaffSavedFilterInput, StaffSavedFilterRecord>
{
  constructor(
    private readonly repository: IStaffSavedFilterRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    const trimmedName = input.name.trim();
    const activeCount = await this.repository.countActive(
      input.tenantId,
      input.staffId,
      input.resourceKey,
    );

    if (activeCount >= MAX_SAVED_FILTERS_PER_STAFF) {
      throw new ApplicationError(
        'PLAN_LIMIT_EXCEEDED',
        'Saved filter limit reached for this resource.',
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
        'SAVED_FILTER_NAME_EXISTS',
        'A saved filter with this name already exists.',
        409,
        { field: 'name' },
      );
    }

    const created = await this.repository.create({
      tenantId: input.tenantId,
      staffId: input.staffId,
      resourceKey: input.resourceKey,
      name: trimmedName,
      description: input.description?.trim() || null,
      filterAst: input.filterAst,
      isDefault: input.isDefault ?? false,
      createdById: input.staffId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'saved_filter.create',
      entityType: 'staff_saved_filter',
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
