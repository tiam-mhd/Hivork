import { describe, expect, it } from 'vitest';

import { RegisterTenantSchema } from './register-tenant.schema.js';
import { CreateTenantCustomerSchema } from './create-tenant-customer.schema.js';
import { CustomerListQuerySchema } from './customer-list-query.schema.js';
import { TenantCustomerResponseSchema } from './tenant-customer-response.schema.js';
import { TenantResponseSchema } from './tenant-response.schema.js';

describe('TASK-052 tenant contracts', () => {
  it('validates register tenant payload', () => {
    expect(
      RegisterTenantSchema.parse({
        name: 'فروشگاه نمونه',
        slug: 'sample-shop',
        ownerName: 'علی',
        ownerPhone: '09123456789',
        verifiedToken: 'jwt-token',
      }),
    ).toMatchObject({ slug: 'sample-shop', ownerPhone: '09123456789' });
  });

  it('validates tenant response', () => {
    expect(
      TenantResponseSchema.parse({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Demo Shop',
        slug: 'demo-shop',
        legalName: null,
        taxId: null,
        logoUrl: null,
        address: null,
        phone: null,
        email: null,
        status: 'trial',
        timezone: 'Asia/Tehran',
        locale: 'fa_IR',
        enabledModules: ['installments'],
        trialEndsAt: '2026-07-01T00:00:00.000Z',
        onboardingCompletedAt: null,
      }),
    ).toMatchObject({ slug: 'demo-shop' });
  });

  it('validates create tenant customer payload', () => {
    expect(
      CreateTenantCustomerSchema.parse({
        phone: '9123456789',
        name: 'علی',
        tags: ['vip'],
      }),
    ).toMatchObject({ phone: '09123456789', name: 'علی' });
  });

  it('validates tenant customer response with bigint field as string', () => {
    expect(
      TenantCustomerResponseSchema.parse({
        id: '00000000-0000-0000-0000-000000000010',
        tenantId: '00000000-0000-0000-0000-000000000001',
        globalCustomerId: '00000000-0000-0000-0000-000000000020',
        localCode: 'C-001',
        tags: ['vip'],
        notes: null,
        internalNotes: null,
        defaultBranchId: null,
        preferredContactChannel: null,
        marketingOptIn: true,
        creditScore: 100,
        overdueCount: 0,
        totalPurchaseRial: '1500000',
        lastPurchaseAt: null,
        createdAt: '2026-06-01T10:00:00.000Z',
        customer: {
          id: '00000000-0000-0000-0000-000000000020',
          phone: '09123456789',
          name: 'علی',
          email: null,
          nationalId: null,
          birthDate: null,
          gender: null,
          address: null,
          preferredContactChannel: null,
          marketingOptIn: false,
          status: 'active',
        },
      }),
    ).toMatchObject({ totalPurchaseRial: '1500000', creditScore: 100 });
  });

  it('validates customer list query with cursor pagination defaults', () => {
    expect(CustomerListQuerySchema.parse({})).toEqual({
      limit: 20,
      sort: 'createdAt:desc',
    });
  });
});
