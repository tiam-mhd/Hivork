import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { AuthResponseSchema } from '../auth/auth-response.schema.js';

export const RegisterTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  legalName: z.string().max(200).optional(),
  taxId: z.string().max(50).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  ownerName: z.string().min(2).max(100),
  ownerPhone: phoneSchema,
  verifiedToken: z.string().min(1),
});

export const RegisterTenantResponseSchema = AuthResponseSchema.extend({
  tenant: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }),
});

export type RegisterTenantDto = z.infer<typeof RegisterTenantSchema>;
export type RegisterTenantResponseDto = z.infer<typeof RegisterTenantResponseSchema>;
