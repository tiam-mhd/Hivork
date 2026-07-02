import type { TenantDetailRecord } from '@hivork/application';

function parseTenantSettings(metadata: unknown): { themeId?: string } | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const record = metadata as Record<string, unknown>;
  const settings = record.settings;
  if (settings && typeof settings === 'object') {
    const themeId = (settings as Record<string, unknown>).themeId;
    if (typeof themeId === 'string' && /^[a-z][a-z0-9-]*$/.test(themeId)) {
      return { themeId };
    }
  }

  if (typeof record.themeId === 'string' && /^[a-z][a-z0-9-]*$/.test(record.themeId)) {
    return { themeId: record.themeId };
  }

  return undefined;
}

export function toTenantResponse(tenant: TenantDetailRecord) {
  const settings = parseTenantSettings(tenant.metadata);

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
    settings,
  };
}
