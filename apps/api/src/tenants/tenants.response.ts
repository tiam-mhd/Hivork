import type { TenantDetailRecord } from '@hivork/application';

export function toTenantResponse(tenant: TenantDetailRecord) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    legalName: tenant.legalName,
    taxId: tenant.taxId,
    logoUrl: tenant.logoUrl,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    status: tenant.status,
    timezone: tenant.timezone,
    locale: tenant.locale,
    enabledModules: tenant.enabledModules,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    onboardingCompletedAt: tenant.onboardingCompletedAt?.toISOString() ?? null,
  };
}
