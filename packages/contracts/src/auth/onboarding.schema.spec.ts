import { describe, expect, it } from 'vitest';

import {
  FlowARegisterOtpRequestSchema,
  FlowARegisterOtpVerifySchema,
  FlowBStaffLoginOtpVerifySchema,
} from './index.js';
import { RegisterTenantSchema } from './index.js';

describe('onboarding schemas', () => {
  it('validates Flow A OTP request', () => {
    expect(
      FlowARegisterOtpRequestSchema.parse({
        phone: '9123456789',
        actor: 'staff',
        intent: 'register',
      }),
    ).toEqual({
      phone: '09123456789',
      actor: 'staff',
      intent: 'register',
    });
  });

  it('validates Flow A OTP verify response shape', () => {
    expect(
      FlowARegisterOtpVerifySchema.parse({
        phone: '09123456789',
        code: '12345',
        actor: 'staff',
        intent: 'register',
      }),
    ).toMatchObject({ actor: 'staff', intent: 'register' });
  });

  it('validates Flow B staff login verify payload', () => {
    expect(
      FlowBStaffLoginOtpVerifySchema.parse({
        phone: '09123456789',
        code: '12345',
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      }),
    ).toMatchObject({ tenantSlug: 'demo-shop' });
  });

  it('validates register tenant payload for step 3', () => {
    expect(
      RegisterTenantSchema.parse({
        name: 'فروشگاه نمونه',
        slug: 'sample-shop',
        ownerName: 'علی',
        ownerPhone: '09123456789',
        verifiedToken: 'jwt-token',
      }),
    ).toMatchObject({ slug: 'sample-shop' });
  });
});
