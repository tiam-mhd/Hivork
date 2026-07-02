import { describe, expect, it } from 'vitest';

import { CustomerEmergencyContact } from './customer-emergency-contact.entity.js';

describe('CustomerEmergencyContact', () => {
  it('normalizes emergency contact phone', () => {
    const contact = CustomerEmergencyContact.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      name: 'علی',
      phone: '0912 345 6789',
      relation: 'parent',
      isPrimary: true,
    });

    expect(contact.phone).toBe('09123456789');
    expect(contact.relation).toBe('parent');
  });

  it('rejects multiple primary emergency contacts', () => {
    const first = CustomerEmergencyContact.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      name: 'علی',
      phone: '09120000001',
      isPrimary: true,
    });
    const second = CustomerEmergencyContact.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      name: 'زهرا',
      phone: '09120000002',
      isPrimary: true,
    });

    expect(() => CustomerEmergencyContact.assertSinglePrimary([first, second])).toThrow(
      expect.objectContaining({ code: 'MULTIPLE_PRIMARY_EMERGENCY_CONTACTS' }),
    );
  });
});
