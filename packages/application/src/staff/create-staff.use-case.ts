import { Staff } from '@hivork/domain';
import { normalizePhone } from '@hivork/contracts';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import {
  assertBranchDataScopeForStaff,
  assertStaffBranchAssignments,
} from './staff-branch-validation.js';

export type CreateStaffInput = {
  tenantId: string;
  actorId: string;
  phone: string;
  name: string;
  email?: string;
  jobTitle?: string;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds?: string[];
  primaryBranchId?: string;
  roleIds?: string[];
  ip?: string;
  userAgent?: string;
};

export type CreateStaffOutput = Awaited<ReturnType<IStaffRepository['create']>>;

export class CreateStaffUseCase implements UseCase<CreateStaffInput, CreateStaffOutput> {
  constructor(
    private readonly staff: IStaffRepository,
    private readonly users: IUserRepository,
    private readonly branches: IBranchReader,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateStaffInput): Promise<CreateStaffOutput> {
    const normalizedPhone = this.normalizePhone(input.phone);
    const assignedBranchIds = [...(input.assignedBranchIds ?? [])];

    await this.assertPlanLimit(input.tenantId);

    const user = await this.users.findOrCreateByPhone(normalizedPhone, input.name);

    const duplicate = await this.staff.findActiveByUserInTenant(input.tenantId, user.id);
    if (duplicate) {
      throw new ApplicationError(
        'STAFF_PHONE_DUPLICATE',
        'Phone number is already used by another staff member.',
        409,
      );
    }

    assertBranchDataScopeForStaff(input.dataScope, assignedBranchIds);
    await assertStaffBranchAssignments(
      this.branches,
      input.tenantId,
      assignedBranchIds,
      input.primaryBranchId,
    );

    let staffEntity: Staff;
    try {
      staffEntity = Staff.create({
        tenantId: input.tenantId,
        userId: user.id,
        name: input.name,
        dataScope: input.dataScope,
        assignedBranchIds,
        primaryBranchId: input.primaryBranchId ?? null,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const created = await this.staff.create({
      id: staffEntity.id,
      tenantId: input.tenantId,
      userId: user.id,
      name: staffEntity.name,
      email: input.email?.trim() || null,
      jobTitle: input.jobTitle?.trim() || null,
      dataScope: staffEntity.dataScope,
      assignedBranchIds: [...staffEntity.assignedBranchIds],
      primaryBranchId: staffEntity.primaryBranchId,
      createdById: input.actorId,
      invitedById: input.actorId,
      roleIds: input.roleIds,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'staff.create',
      entityType: 'staff',
      entityId: created.id,
      newValue: this.auditSnapshot(created),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return created;
  }

  private async assertPlanLimit(tenantId: string): Promise<void> {
    const maxStaff = await this.tenantPlans.getMaxStaff(tenantId);
    const activeCount = await this.staff.countActive(tenantId);
    if (activeCount >= maxStaff) {
      throw new ApplicationError(
        'TENANT_PLAN_LIMIT_EXCEEDED',
        'Tenant staff limit has been reached for the current plan.',
        403,
      );
    }
  }

  private normalizePhone(phone: string): string {
    try {
      return normalizePhone(phone);
    } catch {
      throw new ApplicationError('INVALID_PHONE', 'Phone number is invalid.', 400);
    }
  }

  private auditSnapshot(staff: CreateStaffOutput) {
    return {
      userId: staff.userId,
      phone: staff.phone,
      name: staff.name,
      status: staff.status,
      dataScope: staff.dataScope,
      assignedBranchIds: staff.assignedBranchIds,
      primaryBranchId: staff.primaryBranchId,
    };
  }
}
