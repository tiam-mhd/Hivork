import type { RoleResponseDto } from '@hivork/contracts/core';

export const ROLE_PAGE_PERMISSION = 'core.role.create';
export const ROLE_VIEW_PERMISSION = 'core.role.view';
export const ROLE_CREATE_PERMISSION = 'core.role.create';
export const ROLE_UPDATE_PERMISSION = 'core.role.update';
export const ROLE_DELETE_PERMISSION = 'core.role.delete';

export const DATA_SCOPE_LABELS: Record<RoleResponseDto['dataScope'], string> = {
  all: 'همه داده‌های tenant',
  branch: 'فقط شعب تخصیص‌یافته',
  own: 'فقط رکوردهای خود',
};

export const DATA_SCOPE_HELP: Record<RoleResponseDto['dataScope'], string> = {
  all: 'کارمند به همه شعب و داده‌های tenant دسترسی دارد.',
  branch: 'دسترسی محدود به شعب تخصیص‌داده‌شده در پروفایل کارمند.',
  own: 'فقط رکوردهایی که خود کارمند ایجاد کرده است.',
};

export function splitRoles(roles: RoleResponseDto[]): {
  systemRoles: RoleResponseDto[];
  customRoles: RoleResponseDto[];
} {
  const systemRoles = roles.filter((role) => role.isSystem);
  const customRoles = roles.filter((role) => !role.isSystem);
  return { systemRoles, customRoles };
}

export function slugifyRoleCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s\u200c]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);
}

export function mapRoleDeleteError(code: string, details?: Record<string, unknown>): string {
  if (code === 'DELETE_FORBIDDEN' && details?.reason === 'staff_assigned') {
    return 'این نقش به کارمندان اختصاص دارد. ابتدا نقش کارمندان را تغییر دهید.';
  }

  if (code === 'ROLE_HAS_STAFF') {
    return 'این نقش به کارمندان اختصاص دارد. ابتدا نقش کارمندان را تغییر دهید.';
  }

  if (code === 'ROLE_CODE_EXISTS') {
    return 'شناسه نقش تکراری است.';
  }

  return 'حذف نقش ناموفق بود.';
}

export function mapRoleSaveError(code: string): string | null {
  if (code === 'ROLE_CODE_EXISTS') {
    return 'شناسه نقش تکراری است.';
  }

  if (code === 'ROLE_IS_SYSTEM') {
    return 'نقش‌های سیستمی قابل ویرایش نیستند.';
  }

  return null;
}
