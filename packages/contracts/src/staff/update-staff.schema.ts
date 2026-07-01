import { z } from 'zod';

export const UpdateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional().nullable(),
  nationalId: z.string().trim().max(10).optional().nullable(),
  avatarUrl: z.string().trim().url().optional().nullable(),
  jobTitle: z.string().trim().max(100).optional().nullable(),
  dataScope: z.enum(['all', 'branch', 'own']).optional(),
  assignedBranchIds: z.array(z.string().uuid()).optional(),
  primaryBranchId: z.string().uuid().nullable().optional(),
});

export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;
