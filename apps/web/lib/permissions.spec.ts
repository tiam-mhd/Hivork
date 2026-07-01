import { describe, expect, it } from 'vitest';

import { canConfigureReminders, canCreateBranch, canCreateStaff } from './permissions';

describe('canConfigureReminders', () => {
  it('returns true when reminder.configure permission is present', () => {
    expect(
      canConfigureReminders(['installments.sale.view', 'installments.reminder.configure']),
    ).toBe(true);
  });

  it('returns false for cashier-like permissions', () => {
    expect(
      canConfigureReminders(['installments.sale.view', 'installments.sale.create']),
    ).toBe(false);
  });
});

describe('canCreateBranch', () => {
  it('returns true for owner permissions', () => {
    expect(canCreateBranch(['core.branch.view', 'core.branch.create'])).toBe(true);
  });

  it('hides create for manager without create permission', () => {
    expect(canCreateBranch(['core.branch.view', 'core.branch.update'])).toBe(false);
  });
});

describe('canCreateStaff', () => {
  it('returns true for owner permissions', () => {
    expect(canCreateStaff(['core.staff.view', 'core.staff.create'])).toBe(true);
  });

  it('hides create for manager without create permission', () => {
    expect(canCreateStaff(['core.staff.view', 'core.staff.update'])).toBe(false);
  });
});
