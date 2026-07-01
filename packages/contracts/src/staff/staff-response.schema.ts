import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const StaffResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  status: z.enum(['active', 'suspended']),
  dataScope: z.enum(['all', 'branch', 'own']),
  assignedBranchIds: z.array(z.string().uuid()),
  primaryBranchId: z.string().uuid().nullable(),
  activeBranchId: z.string().uuid().nullable(),
  lastLoginAt: z.string().datetime().nullable(),
});

export type StaffResponseDto = z.infer<typeof StaffResponseSchema>;
