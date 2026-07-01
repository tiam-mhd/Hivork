import {
  ListStaffSecurityAuditResponseSchema,
  type ListStaffSecurityAuditQueryDto,
  type ListStaffSecurityAuditResponseDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export async function fetchStaffSecurityAuditLog(
  query?: ListStaffSecurityAuditQueryDto,
): Promise<ListStaffSecurityAuditResponseDto> {
  const params = new URLSearchParams({ category: 'security' });
  if (query?.cursor) {
    params.set('cursor', query.cursor);
  }
  if (query?.limit) {
    params.set('limit', String(query.limit));
  }
  const result = await apiFetch<unknown>(
    `/staff/me/security/audit-log?${params.toString()}`,
  );
  return ListStaffSecurityAuditResponseSchema.parse(result);
}

export function isStaffSecurityAuditApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export const SECURITY_AUDIT_ACTION_LABELS_FA: Record<string, string> = {
  'auth.login_success': 'ورود موفق',
  'auth.login_failed': 'ورود ناموفق',
  'auth.mfa_success': 'تأیید دو مرحله‌ای موفق',
  'auth.mfa_failed': 'تأیید دو مرحله‌ای ناموفق',
  'security.session.revoked': 'خروج از نشست',
  'security.session.revoked_all': 'خروج از همه نشست‌ها',
  'security.password.changed': 'تغییر رمز عبور',
  'security.password.reset_completed': 'بازنشانی رمز عبور',
  'security.token.reuse_detected': 'استفاده مشکوک از توکن',
};
