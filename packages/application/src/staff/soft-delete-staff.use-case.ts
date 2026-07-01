import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IStaffRepository, StaffRecord } from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertStaffInScope } from './staff-data-scope.js';

export type SoftDeleteStaffInput = {
  tenantId: string;
  actorId: string;
  staffId: string;
  deleteReason?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteStaffOutput = {
  id: string;
  deletedAt: Date;
};

export class SoftDeleteStaffUseCase
  implements UseCase<SoftDeleteStaffInput, SoftDeleteStaffOutput>
{
  constructor(
    private readonly staff: IStaffRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteStaffInput): Promise<SoftDeleteStaffOutput> {
    if (input.staffId === input.actorId) {
      throw new ApplicationError(
        'STAFF_CANNOT_DELETE_SELF',
        'You cannot delete your own staff account.',
        409,
      );
    }

    const record = await this.staff.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!record) {
      const deleted = await this.staff.findDeletedByIdForTenant(input.staffId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Staff is already deleted.', 409);
      }

      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    assertStaffInScope(record, input.staffContext);

    const isOwner = await this.staff.isOwner(record.id, input.tenantId);
    if (isOwner) {
      throw new ApplicationError(
        'STAFF_LAST_OWNER',
        'The tenant owner cannot be deleted.',
        409,
      );
    }

    const deleted = await this.staff.softDelete({
      id: record.id,
      tenantId: input.tenantId,
      deletedById: input.actorId,
      deleteReason: input.deleteReason,
    });

    if (!deleted.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Staff is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'staff.delete',
      entityType: 'staff',
      entityId: record.id,
      oldValue: this.auditSnapshot(record),
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

  private auditSnapshot(staff: StaffRecord) {
    return {
      phone: staff.phone,
      name: staff.name,
      status: staff.status,
      dataScope: staff.dataScope,
    };
  }
}
