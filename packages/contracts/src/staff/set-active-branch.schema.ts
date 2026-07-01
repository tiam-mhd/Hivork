import { z } from 'zod';

export const SetActiveBranchSchema = z.object({
  branchId: z.string().uuid().nullable(),
});

export type SetActiveBranchDto = z.infer<typeof SetActiveBranchSchema>;
