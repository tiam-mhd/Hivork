import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IStaffRepository, StaffRecord } from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import {
  assertBranchDataScopeForStaff,
  assertStaffBranchAssignments,
} from './staff-branch-validation.js';
import { assertStaffInScope } from './staff-data-scope.js';

export type UpdateStaffInput = {
  tenantId: string;
  actorId: string;
  staffId: string;
  phone?: string;
  name?: string;
  email?: string | null;
  jobTitle?: string | null;
  status?: 'active' | 'suspended';
  dataScope?: 'all' | 'branch' | 'own';
  assignedBranchIds?: string[];
  primaryBranchId?: string | null;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type UpdateStaffOutput = StaffRecord;

export class UpdateStaffUseCase implements UseCase<UpdateStaffInput, UpdateStaffOutput> {
  constructor(
    private readonly staff: IStaffRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateStaffInput): Promise<UpdateStaffOutput> {
    if (input.phone !== undefined) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Phone number cannot be changed after creation.',
        400,
        { field: 'phone' },
      );
    }

    const existing = await this.staff.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!existing) {
      const deleted = await this.staff.findDeletedByIdForTenant(input.staffId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Staff has been deleted.', 404);
      }

      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    assertStaffInScope(existing, input.staffContext);

    const nextDataScope = input.dataScope ?? existing.dataScope;
    const nextAssigned =
      input.assignedBranchIds !== undefined
        ? [...input.assignedBranchIds]
        : [...existing.assignedBranchIds];
    const nextPrimary =
      input.primaryBranchId !== undefined ? input.primaryBranchId : existing.primaryBranchId;

    assertBranchDataScopeForStaff(nextDataScope, nextAssigned);
    await assertStaffBranchAssignments(
      this.branches,
      input.tenantId,
      nextAssigned,
      nextPrimary,
    );

    const before = { ...existing };
    const updated = await this.staff.update({
      id: existing.id,
      tenantId: input.tenantId,
      updatedById: input.actorId,
      name: input.name?.trim(),
      email: input.email,
      jobTitle: input.jobTitle,
      status: input.status,
      dataScope: input.dataScope,
      assignedBranchIds: input.assignedBranchIds,
      primaryBranchId: input.primaryBranchId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'staff.update',
      entityType: 'staff',
      entityId: updated.id,
      oldValue: this.auditSnapshot(before),
      newValue: this.auditSnapshot(updated),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }

  private auditSnapshot(staff: StaffRecord) {
    return {
      name: staff.name,
      email: staff.email,
      jobTitle: staff.jobTitle,
      status: staff.status,
      dataScope: staff.dataScope,
      assignedBranchIds: staff.assignedBranchIds,
      primaryBranchId: staff.primaryBranchId,
    };
  }
}
