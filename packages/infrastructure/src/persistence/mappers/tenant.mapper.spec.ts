import { Tenant } from '@hivork/domain';
import type { Tenant as PrismaTenant } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { tenantToCreateInput, tenantToDomain, tenantToUpdateInput } from './tenant.mapper.js';

describe('tenant.mapper', () => {
  const prismaRow: PrismaTenant = {
    id: 'tenant-1',
    name: 'فروشگاه',
    slug: 'shop',
    legalName: null,
    taxId: null,
    logoUrl: null,
    address: null,
    phone: null,
    email: null,
    status: 'trial',
    statusReason: null,
    planId: 'plan-1',
    enabledModules: ['installments'],
    timezone: 'Asia/Tehran',
    locale: 'fa_IR',
    trialEndsAt: null,
    suspendedAt: null,
    onboardingCompletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdById: null,
    updatedById: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 1,
    metadata: null,
  };

  it('maps prisma row to domain tenant', () => {
    const tenant = tenantToDomain(prismaRow);

    expect(tenant.id).toBe('tenant-1');
    expect(tenant.slug).toBe('shop');
    expect(tenant.status).toBe('trial');
    expect(tenant.hasModule('installments')).toBe(true);
  });

  it('maps domain tenant to prisma create input', () => {
    const tenant = Tenant.create({
      name: 'جدید',
      slug: 'new-shop',
      planId: 'plan-1',
      modules: ['installments'],
    });

    const input = tenantToCreateInput(tenant);

    expect(input.slug).toBe('new-shop');
    expect(input.plan).toEqual({ connect: { id: 'plan-1' } });
    expect(input.enabledModules).toEqual(['installments']);
  });

  it('maps soft-deleted tenant to update input', () => {
    const tenant = tenantToDomain(prismaRow);
    tenant.softDelete('admin-1');

    const input = tenantToUpdateInput(tenant);

    expect(input.deletedById).toBe('admin-1');
    expect(input.deletedAt).toBeInstanceOf(Date);
  });
});
