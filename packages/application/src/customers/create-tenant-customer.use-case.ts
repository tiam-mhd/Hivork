import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type {
  GlobalCustomerDetailRecord,
  GlobalCustomerProfileInput,
  IGlobalCustomerRepository,
} from '../ports/global-customer.repository.port.js';
import type {
  CreateTenantCustomerLinkInput,
  ITenantCustomerRepository,
  TenantCustomerDetailRecord,
} from '../ports/tenant-customer.repository.port.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { normalizePhone } from '@hivork/contracts';

export type CreateTenantCustomerInput = {
  tenantId: string;
  actorId: string;
  phone: string;
  name?: string;
  email?: string;
  nationalId?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unspecified';
  address?: string;
  localCode?: string;
  tags?: string[];
  notes?: string;
  internalNotes?: string;
  defaultBranchId?: string;
  preferredContactChannel?: 'telegram' | 'bale' | 'sms' | 'phone';
  marketingOptIn?: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CreateTenantCustomerOutput = {
  customer: TenantCustomerDetailRecord;
  globalCustomer: GlobalCustomerDetailRecord;
  restored: boolean;
};

export class CreateTenantCustomerUseCase
  implements UseCase<CreateTenantCustomerInput, CreateTenantCustomerOutput>
{
  constructor(
    private readonly users: IUserRepository,
    private readonly globalCustomers: IGlobalCustomerRepository,
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly branches: IBranchReader,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateTenantCustomerInput): Promise<CreateTenantCustomerOutput> {
    if (input.defaultBranchId) {
      await this.assertValidBranch(input.tenantId, input.defaultBranchId);
      this.assertBranchDataScope(input.staffContext, input.defaultBranchId);
    }

    const normalizedPhone = this.normalizePhone(input.phone);
    const globalProfile = this.toGlobalProfile(input);

    let globalCustomer = await this.globalCustomers.findByPhoneIncludingDeleted(normalizedPhone);
    let globalRestored = false;

    if (globalCustomer?.deletedAt) {
      globalCustomer = await this.globalCustomers.restoreById(globalCustomer.id);
      globalCustomer = await this.globalCustomers.updateProfile(globalCustomer.id, globalProfile);
      globalRestored = true;
    } else if (!globalCustomer) {
      const user = await this.users.findOrCreateByPhone(normalizedPhone, input.name);
      globalCustomer = await this.globalCustomers.createWithProfile(user.id, globalProfile);
    } else {
      if (globalCustomer.status === 'suspended') {
        throw new ApplicationError('CUSTOMER_SUSPENDED', 'Customer account is suspended.', 403);
      }
      globalCustomer = await this.globalCustomers.updateProfile(globalCustomer.id, globalProfile);
    }

    const existingLink = await this.tenantCustomers.findLinkByGlobalCustomerId(
      input.tenantId,
      globalCustomer.id,
    );

    const linkInput = this.toLinkInput(input, globalCustomer.id);

    let tenantCustomer: TenantCustomerDetailRecord;
    let linkRestored = false;

    if (existingLink?.deletedAt) {
      tenantCustomer = await this.tenantCustomers.restoreLinkAndUpdate({
        ...linkInput,
        id: existingLink.id,
        restoredById: input.actorId,
      });
      linkRestored = true;
    } else if (existingLink) {
      throw new ApplicationError(
        'CUSTOMER_EXISTS',
        'Customer is already linked to this tenant.',
        409,
      );
    } else {
      await this.assertPlanLimit(input.tenantId);
      tenantCustomer = await this.tenantCustomers.createLink(linkInput);
    }

    const restored = globalRestored || linkRestored;

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.create',
      entityType: 'tenant_customer',
      entityId: tenantCustomer.id,
      newValue: {
        globalCustomerId: globalCustomer.id,
        phone: normalizedPhone,
        localCode: tenantCustomer.localCode,
        defaultBranchId: tenantCustomer.defaultBranchId,
        restored,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { customer: tenantCustomer, globalCustomer, restored };
  }

  private normalizePhone(phone: string): string {
    try {
      return normalizePhone(phone);
    } catch {
      throw new ApplicationError('INVALID_PHONE', 'Phone number is invalid.', 400);
    }
  }

  private async assertPlanLimit(tenantId: string): Promise<void> {
    const maxCustomers = await this.tenantPlans.getMaxCustomers(tenantId);
    const activeCount = await this.tenantCustomers.countActive(tenantId);
    if (activeCount >= maxCustomers) {
      throw new ApplicationError(
        'PLAN_LIMIT',
        'Tenant customer limit has been reached for the current plan.',
        403,
      );
    }
  }

  private async assertValidBranch(tenantId: string, branchId: string): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError('INVALID_BRANCH', 'Branch does not exist for this tenant.', 400);
    }
  }

  private assertBranchDataScope(
    staffContext: DataScopeStaffContext,
    defaultBranchId: string,
  ): void {
    if (staffContext.dataScope !== 'branch') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(defaultBranchId)) {
      throw new ApplicationError(
        'BRANCH_NOT_ALLOWED',
        'Default branch is not assigned to this staff.',
        403,
      );
    }
  }

  private toGlobalProfile(input: CreateTenantCustomerInput): GlobalCustomerProfileInput {
    const profile: GlobalCustomerProfileInput = {};

    if (input.name !== undefined) profile.name = input.name;
    if (input.email !== undefined) profile.email = input.email ?? null;
    if (input.nationalId !== undefined) profile.nationalId = input.nationalId ?? null;
    if (input.birthDate !== undefined) {
      profile.birthDate = input.birthDate ? new Date(input.birthDate) : null;
    }
    if (input.gender !== undefined) profile.gender = input.gender ?? null;
    if (input.address !== undefined) profile.address = input.address ?? null;
    if (input.preferredContactChannel !== undefined) {
      profile.preferredContactChannel = input.preferredContactChannel ?? null;
    }
    if (input.marketingOptIn !== undefined) profile.marketingOptIn = input.marketingOptIn;

    return profile;
  }

  private toLinkInput(
    input: CreateTenantCustomerInput,
    globalCustomerId: string,
  ): CreateTenantCustomerLinkInput {
    return {
      tenantId: input.tenantId,
      globalCustomerId,
      createdById: input.actorId,
      localCode: input.localCode ?? null,
      tags: input.tags,
      notes: input.notes ?? null,
      internalNotes: input.internalNotes ?? null,
      defaultBranchId: input.defaultBranchId ?? null,
      preferredContactChannel: input.preferredContactChannel ?? null,
      marketingOptIn: input.marketingOptIn ?? null,
    };
  }
}
