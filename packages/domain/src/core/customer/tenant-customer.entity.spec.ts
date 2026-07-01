import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';

import { TenantCustomer } from './tenant-customer.entity.js';

describe('TenantCustomer', () => {
  it('links tenant to global customer with optional props', () => {
    const customer = TenantCustomer.link('tenant-1', 'global-1', {
      localCode: ' C-001 ',
      notes: 'یادداشت',
      tags: ['vip', 'vip', ' wholesale '],
      marketingOptIn: true,
      preferredContactChannel: 'telegram',
      defaultBranchId: 'branch-1',
    });

    expect(customer.tenantId).toBe('tenant-1');
    expect(customer.globalCustomerId).toBe('global-1');
    expect(customer.localCode).toBe('C-001');
    expect(customer.tags).toEqual(['vip', 'wholesale']);
    expect(customer.marketingOptIn).toBe(true);
    expect(customer.defaultBranchId).toBe('branch-1');
    expect(customer.isDeleted).toBe(false);
  });

  it('updates profile fields', () => {
    const customer = TenantCustomer.link('tenant-1', 'global-1');

    customer.updateProfile({
      localCode: 'C-002',
      defaultBranchId: 'branch-2',
      preferredContactChannel: 'sms',
    });

    expect(customer.localCode).toBe('C-002');
    expect(customer.defaultBranchId).toBe('branch-2');
    expect(customer.preferredContactChannel).toBe('sms');
  });

  it('soft deletes and restores with reason cleared', () => {
    const customer = TenantCustomer.link('tenant-1', 'global-1');

    customer.softDelete('staff-1', 'duplicate record');
    expect(customer.isDeleted).toBe(true);
    expect(customer.deletedById).toBe('staff-1');
    expect(customer.deleteReason).toBe('duplicate record');

    customer.restore();
    expect(customer.isDeleted).toBe(false);
    expect(customer.deletedById).toBeNull();
    expect(customer.deleteReason).toBeNull();
  });

  it('throws when updating deleted customer', () => {
    const customer = TenantCustomer.link('tenant-1', 'global-1');
    customer.softDelete('staff-1');

    expect(() => customer.updateProfile({ notes: 'new' })).toThrow(
      expect.objectContaining({ code: 'CUSTOMER_DELETED' }),
    );
  });

  it('throws on double soft delete', () => {
    const customer = TenantCustomer.link('tenant-1', 'global-1');
    customer.softDelete('staff-1');

    expect(() => customer.softDelete('staff-2')).toThrow(
      expect.objectContaining({ code: 'ALREADY_DELETED' }),
    );
  });

  it('throws restore when not deleted', () => {
    const customer = TenantCustomer.link('tenant-1', 'global-1');

    expect(() => customer.restore()).toThrow(
      expect.objectContaining({ code: 'NOT_DELETED' }),
    );
  });

  it('rejects too many tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);

    expect(() => TenantCustomer.link('tenant-1', 'global-1', { tags })).toThrow(
      expect.objectContaining({ code: 'TOO_MANY_TAGS' }),
    );
  });
});
