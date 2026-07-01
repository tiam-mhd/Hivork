import { z } from 'zod';

import { permissionCodeSchema } from './shared.schema.js';

export const CreatePermissionOverrideSchema = z.object({
  permission: permissionCodeSchema,
  effect: z.enum(['grant', 'deny']),
  reason: z.string().trim().min(5).max(500),
  expiresAt: z.string().datetime().optional(),
});

export type CreatePermissionOverrideDto = z.infer<typeof CreatePermissionOverrideSchema>;

/** Alias for API body validation */
export const PermissionOverrideSchema = CreatePermissionOverrideSchema;

export type PermissionOverrideDto = CreatePermissionOverrideDto;

export const PermissionOverrideResponseSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  permission: z.string(),
  effect: z.enum(['grant', 'deny']),
  reason: z.string(),
  expiresAt: z.string().datetime().nullable(),
  createdById: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type PermissionOverrideResponseDto = z.infer<typeof PermissionOverrideResponseSchema>;

export const PermissionOverrideListResponseSchema = z.object({
  data: z.array(PermissionOverrideResponseSchema),
});

export type PermissionOverrideListResponseDto = z.infer<
  typeof PermissionOverrideListResponseSchema
>;

export const DeletePermissionOverrideResponseSchema = z.object({
  removed: z.literal(true),
});

export type DeletePermissionOverrideResponseDto = z.infer<
  typeof DeletePermissionOverrideResponseSchema
>;
