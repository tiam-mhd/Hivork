import {
  type PermissionDefinition,
  toPermissionDefinition,
} from '@hivork/module-core';

/** Installments RBAC permission codes — authoritative: `docs/02-architecture/rbac.md` § Installments */
export const INSTALLMENTS_PERMISSION_CODES = [
  'installments.sale.view',
  'installments.sale.create',
  'installments.sale.update',
  'installments.sale.edit',
  'installments.sale.cancel',
  'installments.sale.extend',
  'installments.sale.copy',
  'installments.sale.terminate',
  'installments.sale.close',
  'installments.sale.archive',
  'installments.sale.change_status',
  'installments.sale.waive_remaining',
  'installments.sale.guarantor.view',
  'installments.sale.guarantor.create',
  'installments.sale.guarantor.update',
  'installments.sale.guarantor.delete',
  'installments.sale.collateral.view',
  'installments.sale.collateral.create',
  'installments.sale.collateral.update',
  'installments.sale.collateral.delete',
  'installments.sale.collateral.release',
  'installments.sale.collateral.forfeit',
  'installments.sale.edit_financials',
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
  'installments.customer.merge',
  'installments.customer.transfer',
  'installments.customer.blacklist',
  'installments.customer.score.adjust',
  'installments.customer.document.upload',
  'installments.customer.document.delete',
  'installments.customer.note.create',
  'installments.customer.note.update',
  'installments.customer.note.delete',
  'installments.customer.note.delete.any',
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
  'installments.sale.edit': 'ویرایش قرارداد و پیوست‌ها',
  'installments.sale.cancel': 'لغو فروش',
  'installments.sale.extend': 'تمدید قرارداد',
  'installments.sale.copy': 'کپی قرارداد',
  'installments.sale.terminate': 'فسخ قرارداد',
  'installments.sale.close': 'بستن قرارداد',
  'installments.sale.archive': 'آرشیو و بازیابی قرارداد',
  'installments.sale.change_status': 'تغییر وضعیت قرارداد',
  'installments.sale.waive_remaining': 'بخشودگی اقساط باقی‌مانده هنگام بستن',
  'installments.sale.guarantor.view': 'مشاهده ضامنین قرارداد',
  'installments.sale.guarantor.create': 'ثبت ضامن قرارداد',
  'installments.sale.guarantor.update': 'ویرایش ضامن قرارداد',
  'installments.sale.guarantor.delete': 'حذف ضامن قرارداد',
  'installments.sale.collateral.view': 'مشاهده وثایق قرارداد',
  'installments.sale.collateral.create': 'ثبت وثیقه قرارداد',
  'installments.sale.collateral.update': 'ویرایش وثیقه قرارداد',
  'installments.sale.collateral.delete': 'حذف وثیقه قرارداد',
  'installments.sale.collateral.release': 'آزادسازی وثیقه',
  'installments.sale.collateral.forfeit': 'مصادره وثیقه',
  'installments.sale.edit_financials': 'ویرایش مالیات، بیمه و اقلام قرارداد',
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
  'installments.customer.merge': 'ادغام مشتریان تکراری',
  'installments.customer.transfer': 'انتقال مسئولیت مشتری',
  'installments.customer.blacklist': 'بلک‌لیست مشتری',
  'installments.customer.score.adjust': 'تنظیم امتیاز مشتری',
  'installments.customer.document.upload': 'آپلود فایل مشتری',
  'installments.customer.document.delete': 'حذف فایل مشتری',
  'installments.customer.note.create': 'ثبت یادداشت داخلی مشتری',
  'installments.customer.note.update': 'ویرایش یادداشت داخلی مشتری',
  'installments.customer.note.delete': 'حذف یادداشت داخلی مشتری',
  'installments.customer.note.delete.any': 'حذف هر یادداشت داخلی مشتری',
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
