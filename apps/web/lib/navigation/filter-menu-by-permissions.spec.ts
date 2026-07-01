import { describe, expect, it } from 'vitest';

import { ADMIN_MENU, filterMenuByPermissions, hasAnyPermission, permissionSetFromList } from './admin-menu';

const CASHIER_LIKE = [
  'installments.report.dashboard',
  'installments.sale.view',
  'installments.sale.create',
  'installments.report.overdue',
];

const CASHIER_WITH_DENY_SALE_CREATE = [
  'installments.report.dashboard',
  'installments.sale.view',
  'installments.report.overdue',
];

describe('filterMenuByPermissions', () => {
  it('shows dashboard and sales but hides customers for cashier-like permissions', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, CASHIER_LIKE);
    const ids = menu.map((item) => item.id);

    expect(ids).toContain('dashboard');
    expect(ids).toContain('sales');
    expect(ids).not.toContain('customers');
    expect(menu.find((item) => item.id === 'sales')?.children?.map((c) => c.id)).toEqual([
      'sales-list',
      'sales-new',
    ]);
  });

  it('hides sales-new when sale.create is denied (effective permissions)', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, CASHIER_WITH_DENY_SALE_CREATE);
    const sales = menu.find((item) => item.id === 'sales');

    expect(sales?.children?.map((child) => child.id)).toEqual(['sales-list']);
  });

  it('shows reports group when any child permission exists', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, ['installments.report.overdue']);
    expect(menu.map((item) => item.id)).toContain('reports');
  });

  it('hides reports when no child permissions match', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, ['installments.sale.view']);
    expect(menu.map((item) => item.id)).not.toContain('reports');
  });

  it('returns only always-visible menu items when permissions are empty', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, []);
    expect(menu.map((item) => item.id)).toEqual(['settings']);
    expect(menu[0]?.children?.map((child) => child.id)).toEqual(['settings-appearance']);
  });

  it('shows settings branches when core.branch.view is granted', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, ['core.branch.view']);
    const settings = menu.find((item) => item.id === 'settings');
    expect(settings?.children?.map((child) => child.id)).toContain('settings-branches');
  });

  it('shows settings staff when core.staff.view is granted', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, ['core.staff.view']);
    const settings = menu.find((item) => item.id === 'settings');
    expect(settings?.children?.map((child) => child.id)).toContain('settings-staff');
  });

  it('shows settings roles only for owner-like permissions', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, ['core.role.create']);
    const settings = menu.find((item) => item.id === 'settings');
    expect(settings?.children?.map((child) => child.id)).toContain('settings-roles');
  });

  it('hides roles menu for manager without role.create', () => {
    const menu = filterMenuByPermissions(ADMIN_MENU, ['core.role.view', 'core.staff.view']);
    const settings = menu.find((item) => item.id === 'settings');
    expect(settings?.children?.map((child) => child.id)).not.toContain('settings-roles');
  });
});

describe('hasAnyPermission', () => {
  it('checks multiple codes', () => {
    const set = permissionSetFromList(['installments.sale.view']);
    expect(hasAnyPermission(set, ['installments.customer.view', 'installments.sale.view'])).toBe(true);
    expect(hasAnyPermission(set, ['installments.customer.create'])).toBe(false);
  });
});
