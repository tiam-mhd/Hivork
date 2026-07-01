import { describe, expect, it } from 'vitest';

import { GlobalCustomer } from './global-customer.entity.js';

describe('GlobalCustomer', () => {
  it('creates customer profile linked to user', () => {
    const customer = GlobalCustomer.create('user-1', '  علی  ');

    expect(customer.userId).toBe('user-1');
    expect(customer.name).toBe('علی');
    expect(customer.status).toBe('active');
    expect(customer.isDeleted).toBe(false);
  });

  it('updates name', () => {
    const customer = GlobalCustomer.create('user-1');
    customer.updateName('رضا');

    expect(customer.name).toBe('رضا');
  });

  it('soft deletes and restores', () => {
    const customer = GlobalCustomer.create('user-1', 'علی');

    customer.softDelete('staff-1');
    expect(customer.isDeleted).toBe(true);

    customer.restore();
    expect(customer.isDeleted).toBe(false);
  });

  it('pseudonymizes name while staying soft-deleted', () => {
    const customer = GlobalCustomer.create('user-1', 'علی');

    customer.pseudonymize();

    expect(customer.isDeleted).toBe(true);
    expect(customer.isPseudonymized).toBe(true);
    expect(customer.name).toBe('حذف‌شده');
    expect(customer.pseudonymizedAt).toBeInstanceOf(Date);
  });

  it('cannot restore pseudonymized customer', () => {
    const customer = GlobalCustomer.create('user-1');
    customer.pseudonymize();

    expect(() => customer.restore()).toThrow(
      expect.objectContaining({ code: 'CANNOT_RESTORE_PSEUDONYMIZED' }),
    );
  });

  it('cannot update name after pseudonymize', () => {
    const customer = GlobalCustomer.create('user-1', 'علی');
    customer.pseudonymize();

    expect(() => customer.updateName('جدید')).toThrow(
      expect.objectContaining({ code: 'CUSTOMER_PSEUDONYMIZED' }),
    );
  });
});
