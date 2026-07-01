import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { BranchRecord, IBranchRepository } from '../ports/branch.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertBranchInScope } from './branch-data-scope.js';

export type SoftDeleteBranchInput = {
  tenantId: string;
  actorId: string;
  branchId: string;
  deleteReason?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteBranchOutput = {
  id: string;
  deletedAt: Date;
};

export class SoftDeleteBranchUseCase
  implements UseCase<SoftDeleteBranchInput, SoftDeleteBranchOutput>
{
  constructor(
    private readonly branches: IBranchRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteBranchInput): Promise<SoftDeleteBranchOutput> {
    const branch = await this.branches.findActiveById(input.branchId, input.tenantId);
    if (!branch) {
      const deleted = await this.branches.findDeletedById(input.branchId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Branch is already deleted.', 409);
      }

      throw new ApplicationError('BRANCH_NOT_FOUND', 'Branch was not found for this tenant.', 404);
    }

    assertBranchInScope(branch.id, input.staffContext);

    if (branch.isDefault) {
      throw new ApplicationError(
        'BRANCH_IS_DEFAULT',
        'Default branch cannot be deleted.',
        409,
      );
    }

    const activeCount = await this.branches.countActive(input.tenantId);
    if (activeCount <= 1) {
      throw new ApplicationError(
        'DELETE_FORBIDDEN',
        'Cannot delete the last active branch.',
        409,
      );
    }

    const hasActiveSales = await this.branches.hasActiveSales(input.tenantId, branch.id);
    if (hasActiveSales) {
      throw new ApplicationError(
        'DELETE_FORBIDDEN',
        'Branch has active sales and cannot be deleted.',
        409,
        { reason: 'active_sales' },
      );
    }

    const deleted = await this.branches.softDelete({
      id: branch.id,
      tenantId: input.tenantId,
      deletedById: input.actorId,
      deleteReason: input.deleteReason,
    });

    if (!deleted.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Branch is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'branch.delete',
      entityType: 'branch',
      entityId: branch.id,
      oldValue: this.auditSnapshot(branch),
      newValue: {
        deletedAt: deleted.deletedAt,
        deletedById: deleted.deletedById,
        deleteReason: deleted.deleteReason,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { id: deleted.id, deletedAt: deleted.deletedAt };
  }

  private auditSnapshot(branch: BranchRecord) {
    return {
      name: branch.name,
      isDefault: branch.isDefault,
      isActive: branch.isActive,
    };
  }
}
