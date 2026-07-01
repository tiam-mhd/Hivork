import type { TenantOption } from '@/components/auth/tenant-select-step';

export function parseTenantOptions(details?: Record<string, unknown>): TenantOption[] {
  const tenants = details?.tenants;
  if (Array.isArray(tenants) && tenants.length > 0) {
    return tenants
      .filter((item): item is { slug: string; name: string } => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as { slug?: unknown }).slug === 'string' &&
          typeof (item as { name?: unknown }).name === 'string'
        );
      })
      .map((item) => ({ slug: item.slug, name: item.name }));
  }

  const slugs = details?.tenantSlugs;
  if (Array.isArray(slugs)) {
    return slugs
      .filter((slug): slug is string => typeof slug === 'string')
      .map((slug) => ({ slug, name: slug }));
  }

  return [];
}
