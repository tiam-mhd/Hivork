import { Branch } from '@hivork/domain';
import { normalizePhone } from '@hivork/contracts';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchRepository } from '../ports/branch.repository.port.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';

export type CreateBranchInput = {
  tenantId: string;
  actorId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
  ip?: string;
  userAgent?: string;
};

export type CreateBranchOutput = Awaited<ReturnType<IBranchRepository['create']>>;

export class CreateBranchUseCase implements UseCase<CreateBranchInput, CreateBranchOutput> {
  constructor(
    private readonly branches: IBranchRepository,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateBranchInput): Promise<CreateBranchOutput> {
    const normalizedPhone = this.normalizeOptionalPhone(input.phone);
    const trimmedName = input.name.trim();

    await this.assertPlanLimit(input.tenantId);

    const duplicate = await this.branches.findActiveByName(input.tenantId, trimmedName);
    if (duplicate) {
      throw new ApplicationError('VALIDATION_ERROR', 'Branch name already exists.', 409, {
        field: 'name',
      });
    }

    let branchEntity: Branch;
    try {
      branchEntity = Branch.create({
        tenantId: input.tenantId,
        name: trimmedName,
        address: input.address ?? null,
        isDefault: false,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const created = await this.branches.create({
      id: branchEntity.id,
      tenantId: input.tenantId,
      name: branchEntity.name,
      address: branchEntity.address,
      phone: normalizedPhone,
      isActive: input.isActive ?? true,
      createdById: input.actorId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'branch.create',
      entityType: 'branch',
      entityId: created.id,
      newValue: {
        name: created.name,
        isDefault: created.isDefault,
        isActive: created.isActive,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return created;
  }

  private async assertPlanLimit(tenantId: string): Promise<void> {
    const maxBranches = await this.tenantPlans.getMaxBranches(tenantId);
    const activeCount = await this.branches.countActive(tenantId);
    if (activeCount >= maxBranches) {
      throw new ApplicationError(
        'TENANT_PLAN_LIMIT_EXCEEDED',
        'Tenant branch limit has been reached for the current plan.',
        403,
      );
    }
  }

  private normalizeOptionalPhone(phone?: string): string | null {
    if (!phone?.trim()) {
      return null;
    }

    try {
      return normalizePhone(phone);
    } catch {
      throw new ApplicationError('INVALID_PHONE', 'Phone number is invalid.', 400);
    }
  }
}
