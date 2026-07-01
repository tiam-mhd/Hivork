import { z } from 'zod';

export const StaffSessionStatusSchema = z.enum(['active', 'revoked', 'expired']);

export const ListStaffSessionsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'revoked', 'expired', 'all']).optional(),
});

export const StaffSessionItemSchema = z.object({
  id: z.string().uuid(),
  deviceLabel: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastActiveAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  rememberMe: z.boolean(),
  isCurrent: z.boolean(),
  status: StaffSessionStatusSchema,
});

export const ListStaffSessionsResponseSchema = z.object({
  items: z.array(StaffSessionItemSchema),
  nextCursor: z.string().nullable(),
});

export const RevokeStaffSessionResponseSchema = z.object({
  success: z.literal(true),
  revokedCurrent: z.boolean().optional(),
});

export const RevokeAllStaffSessionsSchema = z.object({
  includeCurrent: z.boolean().optional(),
});

export const RevokeAllStaffSessionsResponseSchema = z.object({
  revokedCount: z.number().int().nonnegative(),
});

export type ListStaffSessionsQueryDto = z.infer<typeof ListStaffSessionsQuerySchema>;
export type StaffSessionItemDto = z.infer<typeof StaffSessionItemSchema>;
export type ListStaffSessionsResponseDto = z.infer<typeof ListStaffSessionsResponseSchema>;
export type RevokeStaffSessionResponseDto = z.infer<typeof RevokeStaffSessionResponseSchema>;
export type RevokeAllStaffSessionsDto = z.infer<typeof RevokeAllStaffSessionsSchema>;
export type RevokeAllStaffSessionsResponseDto = z.infer<
  typeof RevokeAllStaffSessionsResponseSchema
>;
