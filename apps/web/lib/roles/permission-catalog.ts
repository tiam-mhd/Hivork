export type PermissionModuleGroup = {
  module: 'core' | 'installments';
  label: string;
  permissions: Array<{ code: string; label: string }>;
};

const CORE_PERMISSION_LABELS: Record<string, string> = {
  'core.branch.view': 'مشاهده شعب',
  'core.branch.create': 'ایجاد شعبه',
  'core.branch.update': 'ویرایش شعبه',
  'core.branch.delete': 'حذف شعبه',
  'core.staff.view': 'مشاهده کارمندان',
  'core.staff.create': 'ایجاد کارمند',
  'core.staff.update': 'ویرایش کارمند',
  'core.staff.delete': 'حذف کارمند',
  'core.role.view': 'مشاهده نقش‌ها',
  'core.role.create': 'ایجاد نقش',
  'core.role.update': 'ویرایش نقش',
  'core.role.delete': 'حذف نقش',
  'core.settings.view': 'مشاهده تنظیمات',
  'core.settings.edit': 'ویرایش تنظیمات',
};

const INSTALLMENTS_PERMISSION_LABELS: Record<string, string> = {
  'installments.sale.view': 'مشاهده فروش‌ها',
  'installments.sale.create': 'ثبت فروش',
  'installments.sale.update': 'ویرایش فروش',
  'installments.sale.cancel': 'لغو فروش',
  'installments.installment.view': 'مشاهده اقساط',
  'installments.installment.waive': 'بخشودگی قسط',
  'installments.installment.penalty': 'ثبت جریمه قسط',
  'installments.installment.discount': 'ثبت تخفیف قسط',
  'installments.installment.reschedule': 'جابجایی سررسید قسط',
  'installments.payment.report': 'ثبت گزارش پرداخت',
  'installments.payment.confirm': 'تأیید پرداخت',
  'installments.payment.void': 'ابطال پرداخت',
  'installments.payment.read': 'مشاهده و چاپ رسید پرداخت',
  'installments.payment.receipt.send': 'ارسال رسید پرداخت',
  'installments.payment.reject': 'رد پرداخت',
  'installments.payment.refund': 'استرداد پرداخت',
  'installments.check.read': 'مشاهده چک‌ها',
  'installments.check.create': 'ثبت چک',
  'installments.check.collect': 'وصول چک',
  'installments.check.bounce': 'برگشت چک',
  'installments.check.transfer': 'انتقال چک',
  'installments.check.update': 'پیگیری و تصویر چک',
  'installments.settlement.manage': 'مدیریت تسویه',
  'installments.reconciliation.manage': 'مغایرت‌گیری',
  'installments.customer.view': 'مشاهده مشتریان',
  'installments.customer.create': 'ثبت مشتری',
  'installments.customer.update': 'ویرایش مشتری',
  'installments.customer.import': 'ورود Excel مشتری',
  'installments.reminder.configure': 'تنظیم یادآور',
  'installments.reminder.view_log': 'مشاهده لاگ یادآور',
  'installments.report.dashboard': 'داشبورد گزارش',
  'installments.report.overdue': 'گزارش معوقات',
  'installments.report.export': 'خروجی گزارش',
};

function toGroup(
  module: PermissionModuleGroup['module'],
  label: string,
  labels: Record<string, string>,
): PermissionModuleGroup {
  return {
    module,
    label,
    permissions: Object.entries(labels).map(([code, permissionLabel]) => ({
      code,
      label: permissionLabel,
    })),
  };
}

export const PERMISSION_MODULE_GROUPS: PermissionModuleGroup[] = [
  toGroup('core', 'ماژول Core', CORE_PERMISSION_LABELS),
  toGroup('installments', 'ماژول اقساط', INSTALLMENTS_PERMISSION_LABELS),
];

export function getPermissionLabel(code: string): string {
  return CORE_PERMISSION_LABELS[code] ?? INSTALLMENTS_PERMISSION_LABELS[code] ?? code;
}

export function isInstallmentsPermission(code: string): boolean {
  return code.startsWith('installments.');
}
