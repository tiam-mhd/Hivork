import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { passwordFieldSchema } from './password-fields.schema.js';

export const ChangePhoneInitSchema = z.object({
  password: passwordFieldSchema,
});

export type ChangePhoneInitDto = z.infer<typeof ChangePhoneInitSchema>;

export const ChangePhoneInitResponseSchema = z.object({
  changeSessionId: z.string().uuid(),
  expiresIn: z.number().int().positive(),
});

export type ChangePhoneInitResponseDto = z.infer<typeof ChangePhoneInitResponseSchema>;

export const ChangePhoneSessionSchema = z.object({
  changeSessionId: z.string().uuid(),
});

export type ChangePhoneSessionDto = z.infer<typeof ChangePhoneSessionSchema>;

export const ChangePhoneVerifyOtpSchema = ChangePhoneSessionSchema.extend({
  code: z.string().regex(/^\d{5}$/, 'OTP code must be 5 digits'),
});

export type ChangePhoneVerifyOtpDto = z.infer<typeof ChangePhoneVerifyOtpSchema>;

export const ChangePhoneRequestNewSchema = ChangePhoneSessionSchema.extend({
  newPhone: phoneSchema,
});

export type ChangePhoneRequestNewDto = z.infer<typeof ChangePhoneRequestNewSchema>;

export const ChangePhoneOtpResponseSchema = z.object({
  expiresIn: z.number().int().positive(),
  message: z.string(),
});

export type ChangePhoneOtpResponseDto = z.infer<typeof ChangePhoneOtpResponseSchema>;

export const ChangePhoneVerifyCurrentResponseSchema = z.object({
  verified: z.literal(true),
});

export type ChangePhoneVerifyCurrentResponseDto = z.infer<
  typeof ChangePhoneVerifyCurrentResponseSchema
>;

export const ChangePhoneConfirmResponseSchema = z.object({
  success: z.literal(true),
  newPhone: phoneSchema,
});

export type ChangePhoneConfirmResponseDto = z.infer<typeof ChangePhoneConfirmResponseSchema>;

export const CHANGE_PHONE_OTP_MESSAGE = 'کد تأیید به شماره موبایل ارسال شد';
