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

export type StaffSecurityAuditAction = (typeof STAFF_SECURITY_AUDIT_ACTIONS)[number];
