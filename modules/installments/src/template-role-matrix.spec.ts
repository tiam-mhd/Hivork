import { describe, expect, it } from 'vitest';

import { TEMPLATE_ROLES } from '../../../prisma/seed/role-mappings.ts';

describe('installments template role matrix (TASK-060)', () => {
  const owner = TEMPLATE_ROLES.find((r) => r.code === 'owner');
  const manager = TEMPLATE_ROLES.find((r) => r.code === 'manager');
  const cashier = TEMPLATE_ROLES.find((r) => r.code === 'cashier');

  it('owner has installments.sale.create and sale.cancel', () => {
    expect(owner?.permissionCodes).toContain('installments.sale.create');
    expect(owner?.permissionCodes).toContain('installments.sale.cancel');
  });

  it('manager has sale.create and sale.cancel', () => {
    expect(manager?.permissionCodes).toContain('installments.sale.create');
    expect(manager?.permissionCodes).toContain('installments.sale.cancel');
  });

  it('cashier has sale.create but not sale.cancel', () => {
    expect(cashier?.permissionCodes).toContain('installments.sale.create');
    expect(cashier?.permissionCodes).not.toContain('installments.sale.cancel');
  });

  it('cashier lacks customer.import and reminder.configure', () => {
    expect(cashier?.permissionCodes).not.toContain('installments.customer.import');
    expect(cashier?.permissionCodes).not.toContain('installments.reminder.configure');
  });
});
