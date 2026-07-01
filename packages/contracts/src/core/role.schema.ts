import { z } from 'zod';

import {
  coreListMetaSchema,
  customRoleCodeSchema,
  dataScopeSchema,
  permissionsArraySchema,
} from './shared.schema.js';

export const CreateRoleSchema = z.object({
  code: customRoleCodeSchema,
  name: z.string().trim().min(2).max(100),
  permissions: permissionsArraySchema,
  dataScope: dataScopeSchema,
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  permissions: permissionsArraySchema.optional(),
  dataScope: dataScopeSchema.optional(),
});

export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;

export const RoleResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
  dataScope: dataScopeSchema,
  version: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  assignedStaffCount: z.number().int().nonnegative().optional(),
});

export type RoleResponseDto = z.infer<typeof RoleResponseSchema>;

export const RoleListResponseSchema = z.object({
  data: z.array(RoleResponseSchema),
  meta: coreListMetaSchema.optional(),
});

export type RoleListResponseDto = z.infer<typeof RoleListResponseSchema>;
