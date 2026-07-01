import { Tenant, type TenantStatus } from '@hivork/domain';
import type { Tenant as PrismaTenant, Prisma } from '@prisma/client';

export function tenantToDomain(row: PrismaTenant): Tenant {
  return new Tenant(
    row.id,
    row.name,
    row.slug,
    row.status as TenantStatus,
    row.planId,
    row.enabledModules,
    row.deletedAt,
    row.deletedById,
  );
}

export function tenantToCreateInput(tenant: Tenant): Prisma.TenantCreateInput {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    plan: { connect: { id: tenant.planId } },
    enabledModules: [...tenant.enabledModules],
  };
}

export function tenantToUpdateInput(tenant: Tenant): Prisma.TenantUpdateInput {
  return {
    name: tenant.name,
    status: tenant.status,
    enabledModules: [...tenant.enabledModules],
    deletedAt: tenant.deletedAt,
    deletedById: tenant.deletedById,
  };
}
