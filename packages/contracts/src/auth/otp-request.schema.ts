import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const OtpRequestSchema = z.object({
  phone: phoneSchema,
  actor: z.enum(['staff', 'customer']),
  intent: z.enum(['login', 'register']).default('login'),
  tenantSlug: z.string().min(3).max(50).optional(),
  captchaToken: z.string().optional(),
});

export const OtpRequestResponseSchema = z.object({
  success: z.literal(true),
  expiresIn: z.number().int().positive(),
});

export type OtpRequestDto = z.infer<typeof OtpRequestSchema>;
export type OtpRequestResponseDto = z.infer<typeof OtpRequestResponseSchema>;
