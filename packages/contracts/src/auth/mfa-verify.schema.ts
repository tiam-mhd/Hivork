import { z } from 'zod';

import { LoginSnapshotSchema } from './staff-last-login.schema.js';

export const MfaRequestOtpSchema = z.object({
  method: z.literal('otp'),
});

export type MfaRequestOtpDto = z.infer<typeof MfaRequestOtpSchema>;

export const MfaRequestOtpResponseSchema = z.object({
  expiresIn: z.number().int().positive(),
  cooldownSeconds: z.number().int().positive(),
});

export type MfaRequestOtpResponseDto = z.infer<typeof MfaRequestOtpResponseSchema>;

export const MfaVerifySchema = z
  .object({
    method: z.enum(['otp', 'totp']),
    code: z.string().min(1).max(9),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'otp' && !/^\d{5}$/.test(value.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OTP code must be 5 digits',
        path: ['code'],
      });
    }
    if (value.method === 'totp') {
      const normalized = value.code.trim().toUpperCase();
      const isSixDigit = /^\d{6}$/.test(value.code.trim());
      const isBackup = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized);
      if (!isSixDigit && !isBackup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a 6-digit authenticator code or backup code (XXXX-XXXX)',
          path: ['code'],
        });
      }
    }
  });

export type MfaVerifyDto = z.infer<typeof MfaVerifySchema>;

export const MfaVerifySessionResponseSchema = z.object({
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
  lastLogin: LoginSnapshotSchema.optional(),
  newIpAlert: z.boolean().optional(),
});

export type MfaVerifySessionResponseDto = z.infer<typeof MfaVerifySessionResponseSchema>;
