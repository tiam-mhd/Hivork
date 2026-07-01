import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { passwordFieldSchema } from './password-fields.schema.js';

export const ForgotPasswordRequestSchema = z.object({
  phone: phoneSchema,
  captchaToken: z.string().optional(),
});

export type ForgotPasswordRequestDto = z.infer<typeof ForgotPasswordRequestSchema>;

export const ForgotPasswordRequestResponseSchema = z.object({
  expiresIn: z.number().int().positive(),
  message: z.string(),
});

export type ForgotPasswordRequestResponseDto = z.infer<typeof ForgotPasswordRequestResponseSchema>;

export const ForgotPasswordVerifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{5}$/, 'OTP code must be 5 digits'),
});

export type ForgotPasswordVerifyOtpDto = z.infer<typeof ForgotPasswordVerifyOtpSchema>;

export const ForgotPasswordVerifyOtpResponseSchema = z.object({
  resetToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export type ForgotPasswordVerifyOtpResponseDto = z.infer<
  typeof ForgotPasswordVerifyOtpResponseSchema
>;

export const ResetPasswordSchema = z
  .object({
    resetToken: z.string().min(1),
    password: passwordFieldSchema,
    passwordConfirm: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password confirmation does not match',
        path: ['passwordConfirm'],
      });
    }
  });

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const ResetPasswordResponseSchema = z.object({
  success: z.literal(true),
});

export type ResetPasswordResponseDto = z.infer<typeof ResetPasswordResponseSchema>;
