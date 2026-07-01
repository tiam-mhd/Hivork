import {
  type PermissionDefinition,
  toPermissionDefinition,
} from '@hivork/module-core';

/** Installments RBAC permission codes — authoritative: `docs/02-architecture/rbac.md` § Installments */
export const INSTALLMENTS_PERMISSION_CODES = [
  'installments.sale.view',
  'installments.sale.create',
  'installments.sale.update',
  'installments.sale.cancel',
  'installments.installment.view',
  'installments.installment.waive',
  'installments.payment.view',
  'installments.payment.confirm',
  'installments.payment.reject',
  'installments.payment.report',
  'installments.customer.view',
  'installments.customer.create',
  'installments.customer.update',
  'installments.customer.import',
  'installments.customer.export',
  'installments.reminder.configure',
  'installments.reminder.view_log',
  'installments.report.dashboard',
  'installments.report.overdue',
  'installments.report.export',
] as const;

export type InstallmentsPermissionCode = (typeof INSTALLMENTS_PERMISSION_CODES)[number];

/** Type-safe permission string for guards and UI — alias of `InstallmentsPermissionCode`. */
export type InstallmentsPermission = InstallmentsPermissionCode;

export const INSTALLMENTS_PERMISSION_DESCRIPTIONS: Record<InstallmentsPermissionCode, string> = {
  'installments.sale.view': 'مشاهده جزئیات فروش',
  'installments.sale.create': 'ثبت فروش قسطی',
  'installments.sale.update': 'ویرایش فروش (محدود — فاز بعد)',
  'installments.sale.cancel': 'لغو فروش',
  'installments.installment.view': 'مشاهده اقساط',
  'installments.installment.waive': 'بخشودگی قسط',
  'installments.payment.view': 'مشاهده گزارش‌های پرداخت',
  'installments.payment.confirm': 'تأیید پرداخت',
  'installments.payment.reject': 'رد پرداخت',
  'installments.payment.report': 'ثبت گزارش پرداخت (staff)',
  'installments.customer.view': 'مشاهده مشتریان',
  'installments.customer.create': 'ثبت مشتری',
  'installments.customer.update': 'ویرایش مشتری',
  'installments.customer.import': 'ورود Excel مشتری',
  'installments.customer.export': 'خروجی Excel مشتری',
  'installments.reminder.configure': 'تنظیم یادآور',
  'installments.reminder.view_log': 'مشاهده لاگ یادآور',
  'installments.report.dashboard': 'داشبورد گزارش',
  'installments.report.overdue': 'گزارش معوقات',
  'installments.report.export': 'خروجی Excel/PDF',
};

/** Skeleton permissions removed in TASK-060 — soft-deleted on seed if present. */
export const OBSOLETE_INSTALLMENTS_PERMISSION_CODES = [
  'installments.sale.list',
  'installments.sale.void',
  'installments.installment.list',
  'installments.report.view',
  'installments.settings.view',
  'installments.settings.update',
] as const;

export const INSTALLMENTS_PERMISSIONS: PermissionDefinition[] =
  INSTALLMENTS_PERMISSION_CODES.map(toPermissionDefinition);

export function getInstallmentsPermissionDescription(
  code: InstallmentsPermissionCode,
): string {
  return INSTALLMENTS_PERMISSION_DESCRIPTIONS[code];
}
