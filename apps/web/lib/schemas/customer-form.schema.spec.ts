import { describe, expect, it } from 'vitest';

import {
  buildUpdatePatch,
  EMPTY_CUSTOMER_FORM_VALUES,
  formValuesToCreateDto,
} from '@/lib/schemas/customer-form.schema';

describe('customer form schema', () => {
  it('builds create dto with required name', () => {
    const dto = formValuesToCreateDto({
      ...EMPTY_CUSTOMER_FORM_VALUES,
      phone: '09121234567',
      name: 'حسین احمدی',
      tags: ['vip'],
    });

    expect(dto.phone).toBe('09121234567');
    expect(dto.name).toBe('حسین احمدی');
    expect(dto.tags).toEqual(['vip']);
  });

  it('builds patch only for changed fields', () => {
    const original = {
      ...EMPTY_CUSTOMER_FORM_VALUES,
      name: 'علی',
      notes: 'قدیمی',
    };
    const current = {
      ...original,
      name: 'علی جدید',
    };

    const patch = buildUpdatePatch(original, current, 3);
    expect(patch).toEqual({ version: 3, name: 'علی جدید' });
  });

  it('returns null when nothing changed', () => {
    const values = {
      ...EMPTY_CUSTOMER_FORM_VALUES,
      name: 'علی',
    };
    expect(buildUpdatePatch(values, values, 2)).toBeNull();
  });

  it('includes addresses with coordinates in create dto', () => {
    const dto = formValuesToCreateDto({
      ...EMPTY_CUSTOMER_FORM_VALUES,
      phone: '09121234567',
      name: 'حسین احمدی',
      addresses: [
        {
          clientKey: 'a1',
          label: 'home',
          line1: 'خیابان ولیعصر',
          line2: '',
          city: 'تهران',
          province: '',
          postalCode: '',
          isPrimary: true,
          latitude: 35.6892,
          longitude: 51.389,
        },
      ],
    });

    expect(dto.addresses).toHaveLength(1);
    expect(dto.addresses?.[0]?.latitude).toBe(35.6892);
    expect(dto.addresses?.[0]?.longitude).toBe(51.389);
  });
});
