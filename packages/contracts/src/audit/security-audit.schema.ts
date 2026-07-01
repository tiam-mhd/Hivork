import { z } from 'zod';

export const STAFF_SECURITY_AUDIT_ACTIONS = [
  'auth.login_success',
  'auth.login_failed',
  'auth.mfa_success',
  'auth.mfa_failed',
  'security.session.revoked',
  'security.session.revoked_all',
  'security.password.changed',
  'security.password.reset_completed',
  'security.token.reuse_detected',
] as const;

export const ListStaffSecurityAuditQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: z.literal('security').optional(),
});

export type ListStaffSecurityAuditQueryDto = z.infer<typeof ListStaffSecurityAuditQuerySchema>;

export const StaffSecurityAuditItemSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  createdAt: z.string().datetime(),
  ipAddress: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export type StaffSecurityAuditItemDto = z.infer<typeof StaffSecurityAuditItemSchema>;

export const ListStaffSecurityAuditResponseSchema = z.object({
  items: z.array(StaffSecurityAuditItemSchema),
  nextCursor: z.string().nullable(),
});

export type ListStaffSecurityAuditResponseDto = z.infer<
  typeof ListStaffSecurityAuditResponseSchema
>;
