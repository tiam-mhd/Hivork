import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';

import { Permission } from './permission.vo.js';

describe('Permission', () => {
  it('accepts valid permission codes', () => {
    expect(new Permission('core.branch.view').code).toBe('core.branch.view');
    expect(new Permission('installments.reminder.view_log').code).toBe(
      'installments.reminder.view_log',
    );
    expect(new Permission('core.customer.restore').code).toBe('core.customer.restore');
  });

  it('rejects invalid permission codes', () => {
    expect(() => new Permission('manage')).toThrow(
      expect.objectContaining({ code: 'INVALID_PERMISSION_CODE' }),
    );
    expect(() => new Permission('CORE.branch.view')).toThrow(DomainError);
  });
});
