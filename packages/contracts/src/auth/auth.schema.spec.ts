import { describe, expect, it } from 'vitest';

import {
  AuthResponseSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  VerifiedTokenResponseSchema,
} from './index.js';

describe('TASK-051 auth contracts', () => {
  describe('OtpRequestSchema', () => {
    it('normalizes phone and defaults intent to login', () => {
      expect(
        OtpRequestSchema.parse({
          phone: '9123456789',
          actor: 'customer',
        }),
      ).toEqual({
        phone: '09123456789',
        actor: 'customer',
        intent: 'login',
      });
    });

    it('accepts staff register without tenantSlug', () => {
      expect(
        OtpRequestSchema.parse({
          phone: '09123456789',
          actor: 'staff',
          intent: 'register',
        }),
      ).toMatchObject({ actor: 'staff', intent: 'register' });
    });

    it('accepts optional tenantSlug for staff login request', () => {
      expect(
        OtpRequestSchema.parse({
          phone: '09123456789',
          actor: 'staff',
          intent: 'login',
          tenantSlug: 'demo-shop',
        }),
      ).toMatchObject({ tenantSlug: 'demo-shop' });
    });
  });

  describe('OtpVerifySchema', () => {
    it('validates a 5-digit OTP code', () => {
      expect(
        OtpVerifySchema.parse({
          phone: '09123456789',
          code: '12345',
          actor: 'customer',
          intent: 'login',
        }),
      ).toMatchObject({ code: '12345' });
    });

    it('rejects non-numeric OTP codes', () => {
      expect(() =>
        OtpVerifySchema.parse({
          phone: '09123456789',
          code: '12a45',
          actor: 'customer',
        }),
      ).toThrow();
    });

    it('allows staff login without tenantSlug for multi-tenant resolution', () => {
      expect(
        OtpVerifySchema.parse({
          phone: '09123456789',
          code: '12345',
          actor: 'staff',
          intent: 'login',
        }),
      ).toMatchObject({ actor: 'staff', intent: 'login' });
    });

    it('allows staff register without tenantSlug', () => {
      expect(
        OtpVerifySchema.parse({
          phone: '09123456789',
          code: '12345',
          actor: 'staff',
          intent: 'register',
        }),
      ).toMatchObject({ actor: 'staff', intent: 'register' });
    });

    it('allows staff login with tenantSlug', () => {
      expect(
        OtpVerifySchema.parse({
          phone: '09123456789',
          code: '12345',
          actor: 'staff',
          intent: 'login',
          tenantSlug: 'demo-shop',
        }),
      ).toMatchObject({ tenantSlug: 'demo-shop' });
    });
  });

  describe('VerifiedTokenResponseSchema', () => {
    it('validates Flow A verify response', () => {
      expect(
        VerifiedTokenResponseSchema.parse({
          verifiedToken: 'jwt-verified',
          expiresIn: 300,
        }),
      ).toEqual({
        verifiedToken: 'jwt-verified',
        expiresIn: 300,
      });
    });
  });

  describe('AuthResponseSchema', () => {
    it('validates staff session response', () => {
      expect(
        AuthResponseSchema.parse({
          accessToken: 'access',
          expiresIn: 900,
          staff: {
            id: '00000000-0000-0000-0000-000000000001',
            tenantId: '00000000-0000-0000-0000-000000000002',
            name: 'Owner',
          },
          tenant: {
            id: '00000000-0000-0000-0000-000000000002',
            slug: 'demo-shop',
            name: 'Demo Shop',
          },
        }),
      ).toMatchObject({
        accessToken: 'access',
        staff: { name: 'Owner' },
        tenant: { slug: 'demo-shop' },
      });
    });

    it('validates customer session response', () => {
      expect(
        AuthResponseSchema.parse({
          accessToken: 'access',
          expiresIn: 900,
          customer: {
            id: '00000000-0000-0000-0000-000000000003',
            phone: '09123456789',
            name: null,
          },
        }),
      ).toMatchObject({
        customer: { phone: '09123456789', name: null },
      });
    });
  });
});
