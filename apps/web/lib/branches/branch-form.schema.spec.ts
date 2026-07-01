import { describe, expect, it } from 'vitest';

import {
  formValuesToCreateDto,
  validateBranchForm,
} from './branch-form.schema';

describe('validateBranchForm', () => {
  it('requires name with min length', () => {
    const errors = validateBranchForm({ name: 'a', address: '', phone: '' });
    expect(errors.name).toBeTruthy();
  });

  it('accepts valid form', () => {
    const errors = validateBranchForm({
      name: 'شعبه مرکزی',
      address: 'تهران',
      phone: '09121234567',
    });
    expect(errors).toEqual({});
  });
});

describe('formValuesToCreateDto', () => {
  it('builds POST payload', () => {
    const dto = formValuesToCreateDto({
      name: 'شعبه شمال',
      address: 'تهران',
      phone: '09129876543',
    });

    expect(dto.name).toBe('شعبه شمال');
    expect(dto.address).toBe('تهران');
    expect(dto.phone).toBe('09129876543');
  });
});
