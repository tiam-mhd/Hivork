import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { LoginSnapshotSchema } from './staff-last-login.schema.js';

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  refreshToken: z.string().optional(),
  staff: z
    .object({
      id: z.string().uuid(),
      tenantId: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
  customer: z
    .object({
      id: z.string().uuid(),
      phone: phoneSchema,
      name: z.string().nullable(),
    })
    .optional(),
  tenant: z
    .object({
      id: z.string().uuid(),
      slug: z.string(),
      name: z.string(),
    })
    .optional(),
  lastLogin: LoginSnapshotSchema.optional(),
  newIpAlert: z.boolean().optional(),
});

export type AuthResponseDto = z.infer<typeof AuthResponseSchema>;
