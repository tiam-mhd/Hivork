import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICustomerAddressRepository } from '../ports/customer-address.repository.port.js';
import type { ICustomerCategoryReader } from '../ports/customer-category.reader.port.js';
import type { ICustomerContactPhoneRepository } from '../ports/customer-contact-phone.repository.port.js';
import type { ICustomerEmergencyContactRepository } from '../ports/customer-emergency-contact.repository.port.js';
import type {
  GlobalCustomerDetailRecord,
  GlobalCustomerProfileInput,
  IGlobalCustomerRepository,
} from '../ports/global-customer.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type {
  CreateTenantCustomerLinkInput,
  ITenantCustomerRepository,
  TenantCustomerDetailWithRelationsRecord,
  TenantCustomerStatus,
} from '../ports/tenant-customer.repository.port.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { normalizePhone } from '@hivork/contracts';
import {
  CustomerAddress,
  CustomerContactPhone,
  CustomerEmergencyContact,
} from '@hivork/domain';

export type CreateTenantCustomerAddressInput = {
  label?: 'home' | 'work' | 'billing' | 'other';
  line1: string;
  line2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateTenantCustomerEmergencyContactInput = {
  name: string;
  phone: string;
  relation?: 'parent' | 'spouse' | 'sibling' | 'other';
  isPrimary?: boolean;
};

export type CreateTenantCustomerContactPhoneInput = {
  phone: string;
  label?: 'mobile' | 'home' | 'work' | 'other';
  isWhatsApp?: boolean;
  isPrimarySecondary?: boolean;
  notes?: string | null;
};

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
  categoryId?: string;
  assignedStaffId?: string;
  status?: TenantCustomerStatus;
  addresses?: CreateTenantCustomerAddressInput[];
  emergencyContacts?: CreateTenantCustomerEmergencyContactInput[];
  contactPhones?: CreateTenantCustomerContactPhoneInput[];
  isBlacklisted?: boolean;
  blacklistReason?: string;
  canBlacklist?: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CreateTenantCustomerOutput = {
  customer: TenantCustomerDetailWithRelationsRecord;
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
    private readonly addresses: ICustomerAddressRepository,
    private readonly emergencyContacts: ICustomerEmergencyContactRepository,
    private readonly contactPhones: ICustomerContactPhoneRepository,
    private readonly categories: ICustomerCategoryReader,
    private readonly staff: IStaffRepository,
    private readonly branches: IBranchReader,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateTenantCustomerInput): Promise<CreateTenantCustomerOutput> {
    if (input.defaultBranchId) {
      await this.assertValidBranch(input.tenantId, input.defaultBranchId);
      this.assertBranchDataScope(input.staffContext, input.defaultBranchId);
    }

    if (input.categoryId) {
      await this.assertValidCategory(input.tenantId, input.categoryId);
    }

    if (input.assignedStaffId) {
      await this.assertValidAssignedStaff(input.tenantId, input.assignedStaffId);
    }

    if (input.isBlacklisted) {
      if (!input.canBlacklist) {
        throw new ApplicationError(
          'PERMISSION_DENIED',
          'You do not have permission to blacklist customers.',
          403,
        );
      }
      if (!input.blacklistReason?.trim()) {
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'blacklistReason is required when isBlacklisted is true.',
          422,
        );
      }
    }

    this.validateNestedCollections(input);

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
    const nestedInput = this.toNestedInput(input, normalizedPhone);

    let linkRestored = false;

    const customer = await this.unitOfWork.transaction(async (tx) => {
      let tenantCustomerId: string;

      if (existingLink?.deletedAt) {
        const restoredLink = await this.tenantCustomers.restoreLinkAndUpdate(
          {
            ...linkInput,
            id: existingLink.id,
            restoredById: input.actorId,
          },
          tx,
        );
        tenantCustomerId = restoredLink.id;
        linkRestored = true;
      } else if (existingLink) {
        throw new ApplicationError(
          'CUSTOMER_EXISTS',
          'Customer is already linked to this tenant.',
          409,
        );
      } else {
        await this.assertPlanLimit(input.tenantId);
        const createdLink = await this.tenantCustomers.createLink(linkInput, tx);
        tenantCustomerId = createdLink.id;
      }

      if (nestedInput.addresses.items.length > 0) {
        await this.addresses.createMany(
          { ...nestedInput.addresses, tenantCustomerId },
          tx,
        );
      }

      if (nestedInput.emergencyContacts.items.length > 0) {
        await this.emergencyContacts.createMany(
          { ...nestedInput.emergencyContacts, tenantCustomerId },
          tx,
        );
      }

      if (nestedInput.contactPhones.items.length > 0) {
        await this.contactPhones.createMany(
          { ...nestedInput.contactPhones, tenantCustomerId },
          tx,
        );
      }

      const detail = await this.tenantCustomers.findDetailWithRelationsById(
        tenantCustomerId,
        input.tenantId,
        tx,
      );

      if (!detail) {
        throw new ApplicationError(
          'CUSTOMER_NOT_FOUND',
          'Customer was not found after create.',
          500,
        );
      }

      return detail;
    });

    const restored = globalRestored || linkRestored;

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.create',
      entityType: 'tenant_customer',
      entityId: customer.id,
      newValue: {
        globalCustomerId: globalCustomer.id,
        phone: normalizedPhone,
        localCode: customer.localCode,
        defaultBranchId: customer.defaultBranchId,
        categoryId: customer.categoryId,
        assignedStaffId: customer.assignedStaffId,
        isBlacklisted: customer.isBlacklisted,
        restored,
        nested: {
          addressCount: customer.addresses.length,
          emergencyContactCount: customer.emergencyContacts.length,
          contactPhoneCount: customer.contactPhones.length,
        },
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { customer, globalCustomer, restored };
  }

  private validateNestedCollections(input: CreateTenantCustomerInput): void {
    try {
      if (input.addresses?.length) {
        const addresses = input.addresses.map((item) =>
          CustomerAddress.create({
            tenantId: input.tenantId,
            tenantCustomerId: 'pending',
            label: item.label,
            line1: item.line1,
            line2: item.line2,
            city: item.city,
            province: item.province,
            postalCode: item.postalCode,
            isPrimary: item.isPrimary,
            latitude: item.latitude,
            longitude: item.longitude,
          }),
        );
        CustomerAddress.assertSinglePrimary(addresses);
      }

      if (input.emergencyContacts?.length) {
        const contacts = input.emergencyContacts.map((item) =>
          CustomerEmergencyContact.create({
            tenantId: input.tenantId,
            tenantCustomerId: 'pending',
            name: item.name,
            phone: item.phone,
            relation: item.relation,
            isPrimary: item.isPrimary,
          }),
        );
        CustomerEmergencyContact.assertSinglePrimary(contacts);
      }

      if (input.contactPhones?.length) {
        CustomerContactPhone.assertMaxCount(input.contactPhones.length);
        CustomerContactPhone.assertNoDuplicatesWithinCustomer(
          input.contactPhones.map((item) => item.phone),
        );
        for (const item of input.contactPhones) {
          CustomerContactPhone.assertNotPrimaryPhone(item.phone, input.phone);
        }
        const phones = input.contactPhones.map((item) =>
          CustomerContactPhone.create({
            tenantId: input.tenantId,
            tenantCustomerId: 'pending',
            phone: item.phone,
            label: item.label,
            isWhatsApp: item.isWhatsApp,
            isPrimarySecondary: item.isPrimarySecondary,
            notes: item.notes,
            primaryUserPhone: input.phone,
          }),
        );
        CustomerContactPhone.assertSinglePrimarySecondary(phones);
      }
    } catch (error) {
      throw mapDomainError(error);
    }
  }

  private toNestedInput(input: CreateTenantCustomerInput, primaryUserPhone: string) {
    return {
      addresses: {
        tenantId: input.tenantId,
        tenantCustomerId: '',
        actorStaffId: input.actorId,
        items: input.addresses ?? [],
      },
      emergencyContacts: {
        tenantId: input.tenantId,
        tenantCustomerId: '',
        actorStaffId: input.actorId,
        items: input.emergencyContacts ?? [],
      },
      contactPhones: {
        tenantId: input.tenantId,
        tenantCustomerId: '',
        actorStaffId: input.actorId,
        primaryUserPhone,
        items: input.contactPhones ?? [],
      },
    };
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

  private async assertValidCategory(tenantId: string, categoryId: string): Promise<void> {
    const exists = await this.categories.existsActiveInTenant(tenantId, categoryId);
    if (!exists) {
      throw new ApplicationError('CATEGORY_NOT_FOUND', 'Customer category was not found.', 422);
    }
  }

  private async assertValidAssignedStaff(tenantId: string, staffId: string): Promise<void> {
    const staff = await this.staff.findActiveByIdForTenant(staffId, tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Assigned staff was not found.', 422);
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
      categoryId: input.categoryId ?? null,
      assignedStaffId: input.assignedStaffId ?? null,
      status: input.status,
      isBlacklisted: input.isBlacklisted,
      blacklistReason: input.blacklistReason ?? null,
    };
  }
}
