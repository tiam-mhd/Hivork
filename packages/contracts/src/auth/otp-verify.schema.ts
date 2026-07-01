import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const OtpVerifyBaseSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(5).regex(/^\d+$/),
  actor: z.enum(['staff', 'customer']),
  intent: z.enum(['login', 'register']).default('login'),
  tenantSlug: z.string().min(3).max(50).optional(),
  rememberMe: z.boolean().optional().default(false),
});

export const OtpVerifySchema = OtpVerifyBaseSchema;

export type OtpVerifyDto = z.infer<typeof OtpVerifySchema>;
