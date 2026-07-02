import { describe, expect, it } from 'vitest';

import { CustomerAddress } from './customer-address.entity.js';
import { DomainError } from '../../errors/domain.error.js';

describe('CustomerAddress', () => {
  it('rejects multiple primary addresses for one customer', () => {
    const first = CustomerAddress.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      line1: 'خیابان اول',
      isPrimary: true,
    });
    const second = CustomerAddress.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      line1: 'خیابان دوم',
      isPrimary: true,
    });

    expect(() => CustomerAddress.assertSinglePrimary([first, second])).toThrow(
      expect.objectContaining({ code: 'MULTIPLE_PRIMARY_ADDRESSES' }),
    );
  });

  it('clears primary flag on soft delete', () => {
    const address = CustomerAddress.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      line1: 'خیابان اول',
      isPrimary: true,
    });

    address.softDelete('staff-1');
    expect(address.isPrimary).toBe(false);
  });
});

describe('CustomerAddress coordinates (IFP-045)', () => {
  const base = {
    tenantId: 'tenant-1',
    tenantCustomerId: 'customer-1',
    line1: 'خیابان اول',
  };

  it('accepts valid Iran coordinates', () => {
    const address = CustomerAddress.create({
      ...base,
      latitude: 35.6892,
      longitude: 51.389,
    });
    expect(address.latitude).toBe(35.6892);
    expect(address.longitude).toBe(51.389);
  });

  it('accepts missing coordinates', () => {
    const address = CustomerAddress.create(base);
    expect(address.latitude).toBeNull();
    expect(address.longitude).toBeNull();
  });

  it('rejects unpaired coordinates', () => {
    expect(() =>
      CustomerAddress.create({
        ...base,
        latitude: 35.6892,
      }),
    ).toThrow(expect.objectContaining({ code: 'COORDINATES_UNPAIRED' } satisfies Partial<DomainError>));
  });

  it('rejects coordinates outside Iran', () => {
    expect(() =>
      CustomerAddress.create({
        ...base,
        latitude: 48,
        longitude: 2,
      }),
    ).toThrow(expect.objectContaining({ code: 'COORDINATE_OUT_OF_IRAN' } satisfies Partial<DomainError>));
  });

  it('requires line1', () => {
    expect(() =>
      CustomerAddress.create({
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
        line1: '   ',
      }),
    ).toThrow(expect.objectContaining({ code: 'FIELD_REQUIRED' } satisfies Partial<DomainError>));
  });
});
