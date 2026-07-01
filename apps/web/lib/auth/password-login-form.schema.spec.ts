import { describe, expect, it } from 'vitest';

import { LOGIN_PASSWORD_I18N } from './login-password-i18n';
import { mapPasswordLoginError } from './map-password-login-error';
import { parseTenantOptions } from './parse-tenant-options';
import { validatePasswordLoginForm } from './password-login-form.schema';
import { ApiClientError } from '../api/client';

describe('validatePasswordLoginForm', () => {
  it('rejects invalid phone with fa message', () => {
    const result = validatePasswordLoginForm({
      phone: '123',
      password: 'Secret1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.phone).toBeTruthy();
    }
  });

  it('rejects empty password', () => {
    const result = validatePasswordLoginForm({
      phone: '09123456789',
      password: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.password).toBe(LOGIN_PASSWORD_I18N.passwordRequired);
    }
  });

  it('accepts valid credentials payload', () => {
    const result = validatePasswordLoginForm({
      phone: '09123456789',
      password: 'Secret1pass',
      rememberMe: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('09123456789');
      expect(result.data.rememberMe).toBe(true);
    }
  });
});

describe('parseTenantOptions', () => {
  it('parses tenant list from NEED_TENANT_SLUG details', () => {
    expect(
      parseTenantOptions({
        tenants: [
          { slug: 'shop-a', name: 'فروشگاه الف' },
          { slug: 'shop-b', name: 'فروشگاه ب' },
        ],
      }),
    ).toEqual([
      { slug: 'shop-a', name: 'فروشگاه الف' },
      { slug: 'shop-b', name: 'فروشگاه ب' },
    ]);
  });
});

describe('mapPasswordLoginError', () => {
  it('maps invalid credentials to fa message and clears password', () => {
    const mapped = mapPasswordLoginError(
      new ApiClientError('AUTH_INVALID_CREDENTIALS', 'Invalid', 401),
    );

    expect(mapped.message).toBe(LOGIN_PASSWORD_I18N.invalidCredentials);
    expect(mapped.clearPassword).toBe(true);
  });

  it('maps account locked with lockedUntil timestamp', () => {
    const mapped = mapPasswordLoginError(
      new ApiClientError('AUTH_ACCOUNT_LOCKED', 'Locked', 423, {
        lockedUntil: '2026-07-01T12:00:00.000Z',
      }),
    );

    expect(mapped.lockedUntil).toBe(Date.parse('2026-07-01T12:00:00.000Z'));
  });

  it('flags tenant picker for NEED_TENANT_SLUG', () => {
    const mapped = mapPasswordLoginError(
      new ApiClientError('NEED_TENANT_SLUG', 'Need slug', 409, {
        tenants: [{ slug: 'demo', name: 'Demo' }],
      }),
    );

    expect(mapped.tenantRequired).toBe(true);
  });
});
