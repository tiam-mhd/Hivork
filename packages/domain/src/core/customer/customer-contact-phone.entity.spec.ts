import { describe, expect, it } from 'vitest';

import {
  CustomerContactPhone,
  DEFAULT_MAX_SECONDARY_PHONES,
} from './customer-contact-phone.entity.js';

describe('CustomerContactPhone', () => {
  it('normalizes phone on create', () => {
    const contactPhone = CustomerContactPhone.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      phone: '+98 912 345 6789',
      label: 'mobile',
      isWhatsApp: true,
    });

    expect(contactPhone.phone).toBe('09123456789');
    expect(contactPhone.label).toBe('mobile');
    expect(contactPhone.isWhatsApp).toBe(true);
  });

  it('rejects secondary phone equal to primary User.phone', () => {
    expect(() =>
      CustomerContactPhone.create({
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
        phone: '09123456789',
        primaryUserPhone: '09123456789',
      }),
    ).toThrow(expect.objectContaining({ code: 'SECONDARY_EQUALS_PRIMARY' }));
  });

  it('rejects duplicate phones within the same customer batch', () => {
    expect(() =>
      CustomerContactPhone.assertNoDuplicatesWithinCustomer([
        '09120000001',
        '0912 000 0001',
      ]),
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_SECONDARY_PHONE' }));
  });

  it('rejects tenant-wide duplicate assigned to another customer', () => {
    expect(() =>
      CustomerContactPhone.assertNoTenantDuplicate(
        '09120000003',
        [
          {
            phone: '09120000003',
            tenantCustomerId: 'customer-2',
            isDeleted: false,
          },
        ],
        'customer-1',
      ),
    ).toThrow(expect.objectContaining({ code: 'CUSTOMER_PHONE_EXISTS' }));
  });

  it('enforces max secondary phone count', () => {
    expect(() =>
      CustomerContactPhone.assertMaxCount(DEFAULT_MAX_SECONDARY_PHONES + 1),
    ).toThrow(expect.objectContaining({ code: 'LIMIT_EXCEEDED' }));
  });

  it('soft deletes and restores', () => {
    const contactPhone = CustomerContactPhone.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      phone: '09120000004',
      isPrimarySecondary: true,
    });

    contactPhone.softDelete('staff-1');
    expect(contactPhone.isDeleted).toBe(true);
    expect(contactPhone.isPrimarySecondary).toBe(false);

    contactPhone.restore();
    expect(contactPhone.isDeleted).toBe(false);
  });
});
