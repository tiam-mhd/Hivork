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

  it('owner has customer.merge but cashier does not (IFP-050)', () => {
    expect(owner?.permissionCodes).toContain('installments.customer.merge');
    expect(cashier?.permissionCodes).not.toContain('installments.customer.merge');
    expect(manager?.permissionCodes).toContain('installments.customer.merge');
  });

  it('owner and manager have customer.transfer but cashier does not (IFP-051)', () => {
    expect(owner?.permissionCodes).toContain('installments.customer.transfer');
    expect(manager?.permissionCodes).toContain('installments.customer.transfer');
    expect(cashier?.permissionCodes).not.toContain('installments.customer.transfer');
  });

  it('owner and manager have scoring/blacklist permissions but cashier does not (IFP-052)', () => {
    expect(owner?.permissionCodes).toContain('installments.customer.blacklist');
    expect(owner?.permissionCodes).toContain('installments.customer.score.adjust');
    expect(manager?.permissionCodes).toContain('installments.customer.blacklist');
    expect(cashier?.permissionCodes).not.toContain('installments.customer.blacklist');
    expect(cashier?.permissionCodes).not.toContain('installments.customer.score.adjust');
  });
});
