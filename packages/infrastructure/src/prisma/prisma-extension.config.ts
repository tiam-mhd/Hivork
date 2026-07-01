import type { DataScopeFilter } from '@hivork/application';
import { Prisma } from '@prisma/client';

export const SOFT_DELETE_MODELS = [
  'PlatformUser',
  'User',
  'Plan',
  'Tenant',
  'Subscription',
  'Branch',
  'Staff',
  'Permission',
  'Role',
  'StaffRole',
  'UserPermissionOverride',
  'GlobalCustomer',
  'BotIdentity',
  'TenantCustomer',
  'TenantSetting',
  'BranchSetting',
  'Sale',
  'PaymentAttempt',
  'UserCredential',
  'UserMfaTotp',
  'StaffSession',
  'TenantApiKey',
  'StaffSavedFilter',
  'StaffSavedView',
] as const satisfies ReadonlyArray<Prisma.ModelName>;

export const SOFT_DELETE_EXEMPT_MODELS = ['AuditLog', 'OutboxEvent', 'RolePermission'] as const satisfies ReadonlyArray<Prisma.ModelName>;

/** Financial history — no hard or soft delete (BR-016). */
export const NO_DELETE_MODELS = ['Installment'] as const satisfies ReadonlyArray<Prisma.ModelName>;

export const TENANT_SCOPED_MODELS = [
  'Subscription',
  'Branch',
  'Staff',
  'Role',
  'TenantCustomer',
  'TenantSetting',
  'AuditLog',
  'OutboxEvent',
  'Sale',
  'Installment',
  'PaymentAttempt',
  'StaffSession',
  'TenantApiKey',
  'StaffSavedFilter',
  'StaffSavedView',
] as const satisfies ReadonlyArray<Prisma.ModelName>;

const MODELS_WITH_BRANCH_ID = new Set<Prisma.ModelName>(['Sale']);
const MODELS_WITH_CREATED_BY_ID = new Set<Prisma.ModelName>([
  'PlatformUser',
  'Tenant',
  'Staff',
  'Role',
  'TenantSetting',
  'BranchSetting',
  'PaymentAttempt',
]);

const MODELS_WITH_CREATED_BY_STAFF_ID = new Set<Prisma.ModelName>(['Sale']);

export function mergeWhere<T extends Record<string, unknown>>(
  where: T | undefined,
  extra: Record<string, unknown>,
): T & Record<string, unknown> {
  if (!where || Object.keys(where).length === 0) {
    return extra as T & Record<string, unknown>;
  }

  return { AND: [where, extra] } as unknown as T & Record<string, unknown>;
}

export function applyDataScopeToWhere(
  model: Prisma.ModelName,
  where: Record<string, unknown> | undefined,
  filter: DataScopeFilter,
): Record<string, unknown> | undefined {
  if (!filter || Object.keys(filter).length === 0) {
    return where;
  }

  const scoped: Record<string, unknown> = {};

  if ('branchId' in filter && filter.branchId !== undefined) {
    if (MODELS_WITH_BRANCH_ID.has(model)) {
      scoped.branchId = filter.branchId;
    } else if (model === 'TenantCustomer') {
      scoped.defaultBranchId = filter.branchId;
    }
  }

  if ('createdById' in filter && filter.createdById !== undefined) {
    if (MODELS_WITH_CREATED_BY_STAFF_ID.has(model)) {
      scoped.createdByStaffId = filter.createdById;
    } else if (MODELS_WITH_CREATED_BY_ID.has(model)) {
      scoped.createdById = filter.createdById;
    }
  }

  if (Object.keys(scoped).length === 0) {
    return where;
  }

  return mergeWhere(where, scoped);
}
