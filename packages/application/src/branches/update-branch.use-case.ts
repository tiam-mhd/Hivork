import { normalizePhone } from '@hivork/contracts';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { BranchRecord, IBranchRepository } from '../ports/branch.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertBranchInScope } from './branch-data-scope.js';

export type UpdateBranchInput = {
  tenantId: string;
  actorId: string;
  branchId: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type UpdateBranchOutput = BranchRecord;

export class UpdateBranchUseCase implements UseCase<UpdateBranchInput, UpdateBranchOutput> {
  constructor(
    private readonly branches: IBranchRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateBranchInput): Promise<UpdateBranchOutput> {
    if (input.isDefault !== undefined) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Default branch cannot be changed via update.',
        400,
        { field: 'isDefault' },
      );
    }

    const existing = await this.branches.findActiveById(input.branchId, input.tenantId);
    if (!existing) {
      const deleted = await this.branches.findDeletedById(input.branchId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Branch has been deleted.', 404);
      }

      throw new ApplicationError('BRANCH_NOT_FOUND', 'Branch was not found for this tenant.', 404);
    }

    assertBranchInScope(existing.id, input.staffContext);

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      const duplicate = await this.branches.findActiveByName(input.tenantId, trimmedName);
      if (duplicate && duplicate.id !== existing.id) {
        throw new ApplicationError('VALIDATION_ERROR', 'Branch name already exists.', 409, {
          field: 'name',
        });
      }
    }

    if (existing.isDefault && input.isActive === false) {
      throw new ApplicationError(
        'DELETE_FORBIDDEN',
        'Default branch cannot be deactivated.',
        409,
      );
    }

    const normalizedPhone =
      input.phone === undefined ? undefined : this.normalizeNullablePhone(input.phone);

    const before = { ...existing };
    const updated = await this.branches.update({
      id: existing.id,
      tenantId: input.tenantId,
      updatedById: input.actorId,
      name: input.name?.trim(),
      address: input.address,
      phone: normalizedPhone,
      isActive: input.isActive,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'branch.update',
      entityType: 'branch',
      entityId: updated.id,
      oldValue: this.auditSnapshot(before),
      newValue: this.auditSnapshot(updated),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }

  private auditSnapshot(branch: BranchRecord) {
    return {
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
    };
  }

  private normalizeNullablePhone(phone: string | null): string | null {
    if (phone === null || !phone.trim()) {
      return null;
    }

    try {
      return normalizePhone(phone);
    } catch {
      throw new ApplicationError('INVALID_PHONE', 'Phone number is invalid.', 400);
    }
  }
}
