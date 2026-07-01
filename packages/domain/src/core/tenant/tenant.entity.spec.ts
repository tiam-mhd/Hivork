import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';

import { Tenant } from './tenant.entity.js';

describe('Tenant', () => {
  const baseProps = {
    name: 'فروشگاه نمونه',
    slug: 'demo-shop',
    planId: 'plan-1',
    modules: ['installments'],
  };

  it('creates a trial tenant with valid props', () => {
    const tenant = Tenant.create(baseProps);

    expect(tenant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(tenant.name).toBe('فروشگاه نمونه');
    expect(tenant.slug).toBe('demo-shop');
    expect(tenant.status).toBe('trial');
    expect(tenant.hasModule('installments')).toBe(true);
    expect(tenant.isDeleted).toBe(false);
  });

  it('rejects invalid slug', () => {
    expect(() => Tenant.create({ ...baseProps, slug: 'Bad_Slug' })).toThrow(DomainError);
    expect(() => Tenant.create({ ...baseProps, slug: 'ab' })).toThrow(DomainError);
  });

  it('rejects empty enabled modules', () => {
    expect(() => Tenant.create({ ...baseProps, modules: [] })).toThrow(
      expect.objectContaining({ code: 'MODULES_REQUIRED' }),
    );
  });

  it('suspends and activates', () => {
    const tenant = Tenant.create(baseProps);

    tenant.suspend('payment overdue');
    expect(tenant.status).toBe('suspended');

    tenant.activate();
    expect(tenant.status).toBe('active');
  });

  it('throws when suspending an already suspended tenant', () => {
    const tenant = Tenant.create(baseProps);
    tenant.suspend();

    expect(() => tenant.suspend()).toThrow(
      expect.objectContaining({ code: 'ALREADY_SUSPENDED' }),
    );
  });

  it('soft deletes and restores', () => {
    const tenant = Tenant.create(baseProps);

    tenant.softDelete('admin-1', 'requested by owner');
    expect(tenant.isDeleted).toBe(true);
    expect(tenant.deletedById).toBe('admin-1');
    expect(tenant.deletedAt).toBeInstanceOf(Date);

    tenant.restore();
    expect(tenant.isDeleted).toBe(false);
    expect(tenant.deletedAt).toBeNull();
    expect(tenant.deletedById).toBeNull();
  });

  it('throws on double soft delete', () => {
    const tenant = Tenant.create(baseProps);
    tenant.softDelete('admin-1');

    expect(() => tenant.softDelete('admin-2')).toThrow(
      expect.objectContaining({ code: 'ALREADY_DELETED' }),
    );
  });

  it('throws restore when not deleted', () => {
    const tenant = Tenant.create(baseProps);

    expect(() => tenant.restore()).toThrow(
      expect.objectContaining({ code: 'NOT_DELETED' }),
    );
  });
});
