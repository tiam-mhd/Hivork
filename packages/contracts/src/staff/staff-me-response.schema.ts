import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const StaffMeResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  status: z.enum(['active', 'suspended']),
  dataScope: z.enum(['all', 'branch', 'own']),
  assignedBranchIds: z.array(z.string().uuid()),
  primaryBranchId: z.string().uuid().nullable(),
  activeBranchId: z.string().uuid().nullable(),
  permissions: z.array(z.string()),
  lastLoginAt: z.string().datetime().nullable(),
});

export type StaffMeResponseDto = z.infer<typeof StaffMeResponseSchema>;
