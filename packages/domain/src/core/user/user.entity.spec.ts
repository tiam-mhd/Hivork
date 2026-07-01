import { describe, expect, it } from 'vitest';

import { User } from './user.entity.js';

describe('User', () => {
  it('creates user with normalized phone', () => {
    const user = User.create('+989123456789', '  علی  ');

    expect(user.phone).toBe('09123456789');
    expect(user.name).toBe('علی');
    expect(user.status).toBe('active');
  });

  it('rejects invalid phone', () => {
    expect(() => User.create('123')).toThrow(
      expect.objectContaining({ code: 'INVALID_PHONE' }),
    );
  });

  it('pseudonymizes phone', () => {
    const user = User.create('09123456789');
    user.pseudonymizePhone();

    expect(user.phone).toBe(`deleted_${user.id}`);
    expect(user.name).toBeNull();
  });
});
