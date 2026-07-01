import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type {
  GlobalCustomerProfileInput,
  IGlobalCustomerRepository,
} from '../ports/global-customer.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type {
  ITenantCustomerRepository,
  PreferredContactChannel,
  TenantCustomerDetailRecord,
  UpdateTenantCustomerLinkInput,
} from '../ports/tenant-customer.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';

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
  staffContext: DataScopeStaffContext;
  canUpdateInternalNotes?: boolean;
  ip?: string;
  userAgent?: string;
};

export type UpdateTenantCustomerOutput = TenantCustomerDetailRecord;

type CustomerPatch = Omit<
  UpdateTenantCustomerInput,
  'tenantId' | 'actorId' | 'tenantCustomerId' | 'version' | 'staffContext' | 'canUpdateInternalNotes' | 'ip' | 'userAgent'
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
] as const satisfies ReadonlyArray<keyof CustomerPatch>;

export class UpdateTenantCustomerUseCase
  implements UseCase<UpdateTenantCustomerInput, UpdateTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly globalCustomers: IGlobalCustomerRepository,
    private readonly branches: IBranchReader,
    private readonly sales: ISaleRepository,
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

    if (patch.defaultBranchId !== undefined && patch.defaultBranchId !== null) {
      await this.assertValidBranch(input.tenantId, patch.defaultBranchId);
      this.assertBranchDataScope(input.staffContext, patch.defaultBranchId);
    }

    const beforeDetail = await this.tenantCustomers.findDetailById(
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

    const globalProfile = this.toGlobalProfile(patch);
    if (Object.keys(globalProfile).length > 0) {
      await this.globalCustomers.updateProfile(existing.globalCustomerId, globalProfile);
    }

    const linkPatch = this.toLinkPatch(patch);
    const updated = await this.tenantCustomers.updateLink({
      id: input.tenantCustomerId,
      tenantId: input.tenantId,
      version: input.version,
      updatedById: input.actorId,
      ...linkPatch,
    });

    const auditDiff = this.buildAuditDiff(beforeDetail, updated, patch);
    if (Object.keys(auditDiff.newValue).length > 0) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorId,
        action: 'customer.update',
        entityType: 'tenant_customer',
        entityId: updated.id,
        oldValue: auditDiff.oldValue,
        newValue: auditDiff.newValue,
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }

    return updated;
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

    return linkPatch;
  }

  private buildAuditDiff(
    before: TenantCustomerDetailRecord,
    after: TenantCustomerDetailRecord,
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

    for (const key of ['name', 'email', 'nationalId', 'birthDate', 'gender', 'address'] as const) {
      if (patch[key] !== undefined) {
        newValue[key] = patch[key];
      }
    }

    if (patch.metadata !== undefined) {
      newValue.metadata = patch.metadata;
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
}
