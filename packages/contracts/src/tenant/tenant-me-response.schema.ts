import { z } from 'zod';

import { TenantResponseSchema } from './tenant-response.schema.js';

export const TenantMeResponseSchema = z.object({
  staffId: z.string().uuid(),
  activeBranchId: z.string().uuid().nullable(),
  tenant: TenantResponseSchema,
});

export type TenantMeResponseDto = z.infer<typeof TenantMeResponseSchema>;
