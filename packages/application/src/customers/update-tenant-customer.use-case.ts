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
  GlobalCustomerProfileInput,
  IGlobalCustomerRepository,
} from '../ports/global-customer.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type {
  ITenantCustomerRepository,
  PreferredContactChannel,
  TenantCustomerDetailWithRelationsRecord,
  UpdateTenantCustomerLinkInput,
} from '../ports/tenant-customer.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import {
  CustomerAddress,
  CustomerContactPhone,
  CustomerEmergencyContact,
} from '@hivork/domain';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import { maskCustomerAuditRecord } from './customer-audit-mask.js';

export type UpdateTenantCustomerAddressInput = {
  id?: string;
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

export type UpdateTenantCustomerEmergencyContactInput = {
  id?: string;
  name: string;
  phone: string;
  relation?: 'parent' | 'spouse' | 'sibling' | 'other';
  isPrimary?: boolean;
};

export type UpdateTenantCustomerContactPhoneInput = {
  id?: string;
  phone: string;
  label?: 'mobile' | 'home' | 'work' | 'other';
  isWhatsApp?: boolean;
  isPrimarySecondary?: boolean;
  notes?: string | null;
};

export type UpdateTenantCustomerInput = {
  tenantId: string;
  actorId: string;
  tenantCustomerId: string;
  version: number;
  phone?: string;
  name?: string;
  email?: string | null;
  nationalId?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | 'unspecified' | null;
  address?: string | null;
  localCode?: string | null;
  tags?: string[];
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  preferredContactChannel?: PreferredContactChannel | null;
  marketingOptIn?: boolean;
  metadata?: Record<string, unknown>;
  categoryId?: string | null;
  assignedStaffId?: string | null;
  addresses?: UpdateTenantCustomerAddressInput[];
  emergencyContacts?: UpdateTenantCustomerEmergencyContactInput[];
  contactPhones?: UpdateTenantCustomerContactPhoneInput[];
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
  canBlacklist?: boolean;
  staffContext: DataScopeStaffContext;
  canUpdateInternalNotes?: boolean;
  ip?: string;
  userAgent?: string;
};

export type UpdateTenantCustomerOutput = TenantCustomerDetailWithRelationsRecord;

type CustomerPatch = Omit<
  UpdateTenantCustomerInput,
  | 'tenantId'
  | 'actorId'
  | 'tenantCustomerId'
  | 'version'
  | 'staffContext'
  | 'canUpdateInternalNotes'
  | 'canBlacklist'
  | 'ip'
  | 'userAgent'
>;

const PATCH_KEYS = [
  'name',
  'email',
  'nationalId',
  'birthDate',
  'gender',
  'address',
  'localCode',
  'tags',
  'notes',
  'internalNotes',
  'defaultBranchId',
  'preferredContactChannel',
  'marketingOptIn',
  'metadata',
  'categoryId',
  'assignedStaffId',
  'addresses',
  'emergencyContacts',
  'contactPhones',
  'isBlacklisted',
  'blacklistReason',
] as const satisfies ReadonlyArray<keyof CustomerPatch>;

export class UpdateTenantCustomerUseCase
  implements UseCase<UpdateTenantCustomerInput, UpdateTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly globalCustomers: IGlobalCustomerRepository,
    private readonly addresses: ICustomerAddressRepository,
    private readonly emergencyContacts: ICustomerEmergencyContactRepository,
    private readonly contactPhones: ICustomerContactPhoneRepository,
    private readonly categories: ICustomerCategoryReader,
    private readonly staff: IStaffRepository,
    private readonly branches: IBranchReader,
    private readonly sales: ISaleRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateTenantCustomerInput): Promise<UpdateTenantCustomerOutput> {
    if (input.phone !== undefined) {
      throw new ApplicationError('VALIDATION_ERROR', 'Phone cannot be changed.', 400);
    }

    const patch = this.extractPatch(input);
    if (Object.keys(patch).length === 0) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'At least one field must be provided besides version.',
        400,
      );
    }

    if (patch.internalNotes !== undefined && !input.canUpdateInternalNotes) {
      throw new ApplicationError(
        'PERMISSION_DENIED',
        'You are not allowed to update internal notes.',
        403,
      );
    }

    if (
      (patch.isBlacklisted !== undefined || patch.blacklistReason !== undefined) &&
      !input.canBlacklist
    ) {
      throw new ApplicationError(
        'PERMISSION_DENIED',
        'You do not have permission to blacklist customers.',
        403,
      );
    }

    if (patch.isBlacklisted && !patch.blacklistReason?.trim()) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'blacklistReason is required when isBlacklisted is true.',
        422,
      );
    }

    const existing = await this.tenantCustomers.findActiveById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!existing) {
      const deleted = await this.tenantCustomers.findDeletedById(
        input.tenantCustomerId,
        input.tenantId,
      );
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Customer has been deleted.', 404);
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    if (existing.version !== input.version) {
      throw new ApplicationError(
        'OPTIMISTIC_LOCK_CONFLICT',
        'Customer was updated by another user. Refresh and try again.',
        409,
      );
    }

    await assertTenantCustomerInScope(existing, input.staffContext, input.actorId, this.sales);

    const beforeDetail = await this.tenantCustomers.findDetailWithRelationsById(
      input.tenantCustomerId,
      input.tenantId,
    );
    if (!beforeDetail) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    if (beforeDetail.status === 'archived') {
      throw new ApplicationError(
        'CUSTOMER_ARCHIVED',
        'Archived customers cannot be updated.',
        409,
      );
    }

    if (patch.defaultBranchId !== undefined && patch.defaultBranchId !== null) {
      await this.assertValidBranch(input.tenantId, patch.defaultBranchId);
      this.assertBranchDataScope(input.staffContext, patch.defaultBranchId);
    }

    if (patch.categoryId !== undefined && patch.categoryId !== null) {
      await this.assertValidCategory(input.tenantId, patch.categoryId);
    }

    if (patch.assignedStaffId !== undefined && patch.assignedStaffId !== null) {
      await this.assertValidAssignedStaff(input.tenantId, patch.assignedStaffId);
    }

    const globalCustomer = await this.globalCustomers.findById(existing.globalCustomerId);
    if (!globalCustomer) {
      throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Global customer not found.', 404);
    }

    this.validateNestedCollections(patch, globalCustomer.phone);

    const globalProfile = this.toGlobalProfile(patch);
    const linkPatch = this.toLinkPatch(patch);

    await this.unitOfWork.transaction(async (tx) => {
      if (Object.keys(globalProfile).length > 0) {
        await this.globalCustomers.updateProfile(existing.globalCustomerId, globalProfile);
      }

      await this.tenantCustomers.updateLink(
        {
          id: input.tenantCustomerId,
          tenantId: input.tenantId,
          version: input.version,
          updatedById: input.actorId,
          ...linkPatch,
        },
        tx,
      );

      if (patch.addresses !== undefined) {
        await this.addresses.syncMany(
          {
            tenantId: input.tenantId,
            tenantCustomerId: input.tenantCustomerId,
            actorStaffId: input.actorId,
            items: patch.addresses,
          },
          tx,
        );
      }

      if (patch.emergencyContacts !== undefined) {
        await this.emergencyContacts.syncMany(
          {
            tenantId: input.tenantId,
            tenantCustomerId: input.tenantCustomerId,
            actorStaffId: input.actorId,
            items: patch.emergencyContacts,
          },
          tx,
        );
      }

      if (patch.contactPhones !== undefined) {
        await this.contactPhones.syncMany(
          {
            tenantId: input.tenantId,
            tenantCustomerId: input.tenantCustomerId,
            actorStaffId: input.actorId,
            primaryUserPhone: globalCustomer.phone,
            items: patch.contactPhones,
          },
          tx,
        );
      }
    });

    const afterDetail = await this.tenantCustomers.findDetailWithRelationsById(
      input.tenantCustomerId,
      input.tenantId,
    );
    if (!afterDetail) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    const auditDiff = this.buildAuditDiff(beforeDetail, afterDetail, patch);
    if (Object.keys(auditDiff.newValue).length > 0) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorId,
        action: 'customer.update',
        entityType: 'tenant_customer',
        entityId: afterDetail.id,
        oldValue: maskCustomerAuditRecord(auditDiff.oldValue),
        newValue: maskCustomerAuditRecord(auditDiff.newValue),
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }

    return afterDetail;
  }

  private extractPatch(input: UpdateTenantCustomerInput): CustomerPatch {
    const patch: CustomerPatch = {};

    for (const key of PATCH_KEYS) {
      if (input[key] !== undefined) {
        patch[key] = input[key] as never;
      }
    }

    return patch;
  }

  private validateNestedCollections(patch: CustomerPatch, primaryUserPhone: string): void {
    try {
      if (patch.addresses !== undefined) {
        const addresses = patch.addresses.map((item) =>
          CustomerAddress.create({
            tenantId: 'pending',
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

      if (patch.emergencyContacts !== undefined) {
        const contacts = patch.emergencyContacts.map((item) =>
          CustomerEmergencyContact.create({
            tenantId: 'pending',
            tenantCustomerId: 'pending',
            name: item.name,
            phone: item.phone,
            relation: item.relation,
            isPrimary: item.isPrimary,
          }),
        );
        CustomerEmergencyContact.assertSinglePrimary(contacts);
      }

      if (patch.contactPhones !== undefined) {
        CustomerContactPhone.assertMaxCount(patch.contactPhones.length);
        CustomerContactPhone.assertNoDuplicatesWithinCustomer(
          patch.contactPhones.map((item) => item.phone),
        );
        for (const item of patch.contactPhones) {
          CustomerContactPhone.assertNotPrimaryPhone(item.phone, primaryUserPhone);
        }
        const phones = patch.contactPhones.map((item) =>
          CustomerContactPhone.create({
            tenantId: 'pending',
            tenantCustomerId: 'pending',
            phone: item.phone,
            label: item.label,
            isWhatsApp: item.isWhatsApp,
            isPrimarySecondary: item.isPrimarySecondary,
            notes: item.notes,
            primaryUserPhone,
          }),
        );
        CustomerContactPhone.assertSinglePrimarySecondary(phones);
      }
    } catch (error) {
      throw mapDomainError(error);
    }
  }

  private toGlobalProfile(patch: CustomerPatch): GlobalCustomerProfileInput {
    const profile: GlobalCustomerProfileInput = {};

    if (patch.name !== undefined) profile.name = patch.name ?? undefined;
    if (patch.email !== undefined) profile.email = patch.email;
    if (patch.nationalId !== undefined) profile.nationalId = patch.nationalId;
    if (patch.birthDate !== undefined) {
      profile.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;
    }
    if (patch.gender !== undefined) profile.gender = patch.gender;
    if (patch.address !== undefined) profile.address = patch.address;
    if (patch.preferredContactChannel !== undefined) {
      profile.preferredContactChannel = patch.preferredContactChannel;
    }
    if (patch.marketingOptIn !== undefined) profile.marketingOptIn = patch.marketingOptIn;

    return profile;
  }

  private toLinkPatch(patch: CustomerPatch): Partial<UpdateTenantCustomerLinkInput> {
    const linkPatch: Partial<UpdateTenantCustomerLinkInput> = {};

    if (patch.localCode !== undefined) linkPatch.localCode = patch.localCode;
    if (patch.tags !== undefined) linkPatch.tags = patch.tags;
    if (patch.notes !== undefined) linkPatch.notes = patch.notes;
    if (patch.internalNotes !== undefined) linkPatch.internalNotes = patch.internalNotes;
    if (patch.defaultBranchId !== undefined) linkPatch.defaultBranchId = patch.defaultBranchId;
    if (patch.preferredContactChannel !== undefined) {
      linkPatch.preferredContactChannel = patch.preferredContactChannel;
    }
    if (patch.marketingOptIn !== undefined) linkPatch.marketingOptIn = patch.marketingOptIn;
    if (patch.metadata !== undefined) linkPatch.metadata = patch.metadata;
    if (patch.categoryId !== undefined) linkPatch.categoryId = patch.categoryId;
    if (patch.assignedStaffId !== undefined) linkPatch.assignedStaffId = patch.assignedStaffId;
    if (patch.isBlacklisted !== undefined) linkPatch.isBlacklisted = patch.isBlacklisted;
    if (patch.blacklistReason !== undefined) linkPatch.blacklistReason = patch.blacklistReason;

    return linkPatch;
  }

  private buildAuditDiff(
    before: TenantCustomerDetailWithRelationsRecord,
    after: TenantCustomerDetailWithRelationsRecord,
    patch: CustomerPatch,
  ): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    const assignIfChanged = (key: string, oldField: unknown, newField: unknown) => {
      if (JSON.stringify(oldField) !== JSON.stringify(newField)) {
        oldValue[key] = oldField;
        newValue[key] = newField;
      }
    };

    if (patch.localCode !== undefined) assignIfChanged('localCode', before.localCode, after.localCode);
    if (patch.tags !== undefined) assignIfChanged('tags', before.tags, after.tags);
    if (patch.notes !== undefined) assignIfChanged('notes', before.notes, after.notes);
    if (patch.internalNotes !== undefined) {
      assignIfChanged('internalNotes', before.internalNotes, after.internalNotes);
    }
    if (patch.defaultBranchId !== undefined) {
      assignIfChanged('defaultBranchId', before.defaultBranchId, after.defaultBranchId);
    }
    if (patch.preferredContactChannel !== undefined) {
      assignIfChanged(
        'preferredContactChannel',
        before.preferredContactChannel,
        after.preferredContactChannel,
      );
    }
    if (patch.marketingOptIn !== undefined) {
      assignIfChanged('marketingOptIn', before.marketingOptIn, after.marketingOptIn);
    }
    if (patch.categoryId !== undefined) {
      assignIfChanged('categoryId', before.categoryId, after.categoryId);
    }
    if (patch.assignedStaffId !== undefined) {
      assignIfChanged('assignedStaffId', before.assignedStaffId, after.assignedStaffId);
    }
    if (patch.isBlacklisted !== undefined || patch.blacklistReason !== undefined) {
      assignIfChanged('isBlacklisted', before.isBlacklisted, after.isBlacklisted);
      assignIfChanged('blacklistReason', before.blacklistReason, after.blacklistReason);
    }
    if (patch.metadata !== undefined) {
      newValue.metadata = patch.metadata;
    }

    for (const key of ['name', 'email', 'nationalId', 'birthDate', 'gender', 'address'] as const) {
      if (patch[key] !== undefined) {
        newValue[key] = patch[key];
      }
    }

    if (patch.addresses !== undefined) {
      assignIfChanged('addresses', before.addresses, after.addresses);
    }
    if (patch.emergencyContacts !== undefined) {
      assignIfChanged('emergencyContacts', before.emergencyContacts, after.emergencyContacts);
    }
    if (patch.contactPhones !== undefined) {
      assignIfChanged('contactPhones', before.contactPhones, after.contactPhones);
    }

    return { oldValue, newValue };
  }

  private async assertValidBranch(tenantId: string, branchId: string): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError('BRANCH_NOT_FOUND', 'Branch does not exist for this tenant.', 400);
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
}
