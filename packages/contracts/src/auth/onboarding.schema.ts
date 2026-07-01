import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { OtpRequestSchema } from './otp-request.schema.js';
import { OtpVerifyBaseSchema } from './otp-verify.schema.js';

/**
 * TASK-055 — unified onboarding flows
 *
 * Flow A: staff register → verifiedToken → POST /tenants/register (TASK-057)
 * Flow B: staff login → session tokens (+ optional tenantSlug)
 * Flow C: customer login → session tokens
 */

export const FlowARegisterOtpRequestSchema = OtpRequestSchema.extend({
  actor: z.literal('staff'),
  intent: z.literal('register'),
});

export const FlowARegisterOtpVerifySchema = OtpVerifyBaseSchema.extend({
  actor: z.literal('staff'),
  intent: z.literal('register'),
});

export const FlowBStaffLoginOtpVerifySchema = OtpVerifyBaseSchema.extend({
  actor: z.literal('staff'),
  intent: z.literal('login'),
  tenantSlug: z.string().min(3).max(50).optional(),
});

export const FlowCCustomerOtpRequestSchema = OtpRequestSchema.extend({
  actor: z.literal('customer'),
  intent: z.literal('login').default('login'),
});

export const FlowCCustomerOtpVerifySchema = OtpVerifyBaseSchema.extend({
  actor: z.literal('customer'),
  intent: z.literal('login').default('login'),
});

export const VerifiedTokenClaimsSchema = z.object({
  phone: phoneSchema,
  actor: z.literal('staff'),
  purpose: z.literal('register'),
  type: z.literal('verified'),
});

export const NeedTenantSlugErrorSchema = z.object({
  code: z.literal('NEED_TENANT_SLUG'),
  details: z.object({
    tenantSlugs: z.array(z.string()).optional(),
    tenants: z
      .array(
        z.object({
          slug: z.string(),
          name: z.string(),
        }),
      )
      .optional(),
  }),
});

export type FlowARegisterOtpRequestDto = z.infer<typeof FlowARegisterOtpRequestSchema>;
export type FlowARegisterOtpVerifyDto = z.infer<typeof FlowARegisterOtpVerifySchema>;
export type FlowBStaffLoginOtpVerifyDto = z.infer<typeof FlowBStaffLoginOtpVerifySchema>;
export type FlowCCustomerOtpRequestDto = z.infer<typeof FlowCCustomerOtpRequestSchema>;
export type FlowCCustomerOtpVerifyDto = z.infer<typeof FlowCCustomerOtpVerifySchema>;
export type VerifiedTokenClaimsDto = z.infer<typeof VerifiedTokenClaimsSchema>;
