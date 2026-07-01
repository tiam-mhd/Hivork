import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const PasswordLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required').max(128),
  tenantSlug: z.string().min(3).max(50).optional(),
  rememberMe: z.boolean().optional().default(false),
  captchaToken: z.string().optional(),
});

export type PasswordLoginDto = z.infer<typeof PasswordLoginSchema>;

export const PasswordLoginLastLoginSchema = z.object({
  at: z.string().datetime(),
  ip: z.string().optional(),
  deviceLabel: z.string().optional(),
});

export const PasswordLoginSessionResponseSchema = z.object({
  kind: z.literal('session'),
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  staff: z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string(),
  }),
  tenant: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }),
  lastLogin: PasswordLoginLastLoginSchema.optional(),
  newIpAlert: z.boolean().optional(),
});

export const PasswordLoginMfaRequiredResponseSchema = z.object({
  kind: z.literal('mfa_required'),
  mfaToken: z.string(),
  expiresIn: z.number().int().positive(),
  methods: z.array(z.enum(['otp', 'totp'])),
});

export const PasswordLoginMustChangePasswordResponseSchema = z.object({
  kind: z.literal('must_change_password'),
  changePasswordToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export const PasswordLoginResponseSchema = z.discriminatedUnion('kind', [
  PasswordLoginSessionResponseSchema,
  PasswordLoginMfaRequiredResponseSchema,
  PasswordLoginMustChangePasswordResponseSchema,
]);

export type PasswordLoginSessionResponseDto = z.infer<typeof PasswordLoginSessionResponseSchema>;
export type PasswordLoginMfaRequiredResponseDto = z.infer<typeof PasswordLoginMfaRequiredResponseSchema>;
export type PasswordLoginMustChangePasswordResponseDto = z.infer<
  typeof PasswordLoginMustChangePasswordResponseSchema
>;
export type PasswordLoginResponseDto = z.infer<typeof PasswordLoginResponseSchema>;
