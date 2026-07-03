export const ADMIN_SHELL_VERSION = 'v1.0';

export type NavChildItem = {
  id: string;
  label: string;
  href: string;
  permission: string;
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  /** `null` = visible when any child is visible (e.g. گزارش‌ها) */
  permission: string | null;
  children?: NavChildItem[];
};

export const PERMISSION_LABELS_FA: Record<string, string> = {
  'installments.report.dashboard': 'مشاهده داشبورد',
  'installments.installment.view': 'مشاهده اقساط',
  'installments.customer.view': 'مشاهده مشتریان',
  'installments.customer.create': 'ثبت مشتری',
  'installments.customer.import': 'ورود Excel مشتری',
  'installments.customer.merge': 'ادغام مشتریان تکراری',
  'installments.customer.transfer': 'انتقال مسئولیت مشتری',
  'installments.customer.blacklist': 'بلک‌لیست مشتری',
  'installments.customer.score.adjust': 'تنظیم امتیاز مشتری',
  'installments.customer.document.upload': 'آپلود مدرک مشتری',
  'installments.customer.document.delete': 'حذف مدرک مشتری',
  'installments.customer.note.create': 'ثبت یادداشت داخلی مشتری',
  'installments.customer.note.update': 'ویرایش یادداشت داخلی مشتری',
  'installments.customer.note.delete': 'حذف یادداشت داخلی مشتری',
  'installments.customer.note.delete.any': 'حذف هر یادداشت داخلی مشتری',
  'installments.sale.view': 'مشاهده فروش‌ها',
  'installments.sale.create': 'ثبت فروش',
  'installments.report.overdue': 'گزارش معوقات',
  'installments.payment.read': 'مشاهده پرداخت‌ها',
  'installments.payment.refund': 'استرداد پرداخت',
  'installments.check.read': 'مشاهده چک‌ها',
  'installments.check.create': 'ثبت چک',
  'installments.check.collect': 'وصول چک',
  'installments.check.bounce': 'برگشت چک',
  'installments.check.transfer': 'انتقال چک',
  'installments.check.update': 'پیگیری و تصویر چک',
  'installments.settlement.manage': 'مدیریت تسویه',
  'installments.reconciliation.manage': 'مغایرت‌گیری',
  'installments.reminder.configure': 'تنظیم یادآور',
  'core.settings.view': 'مشاهده تنظیمات',
  'core.settings.edit': 'ویرایش تنظیمات',
  'core.branch.view': 'مشاهده شعب',
  'core.branch.create': 'ایجاد شعبه',
  'core.branch.update': 'ویرایش شعبه',
  'core.branch.delete': 'حذف شعبه',
  'core.staff.view': 'مشاهده کارمندان',
  'core.staff.create': 'ایجاد کارمند',
  'core.staff.update': 'ویرایش کارمند',
  'core.staff.delete': 'حذف کارمند',
  'core.role.view': 'مشاهده نقش‌ها',
  'core.role.create': 'مدیریت نقش‌ها',
  'core.role.update': 'ویرایش نقش',
  'core.role.delete': 'حذف نقش',
  'core.recycle.view': 'مشاهده سطل بازیافت',
};

export const ADMIN_MENU: NavItem[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    href: '/admin/dashboard',
    icon: 'LayoutDashboard',
    permission: 'installments.report.dashboard',
  },
  {
    id: 'customers',
    label: 'مشتریان',
    permission: 'installments.customer.view',
    children: [
      {
        id: 'customers-list',
        label: 'لیست مشتریان',
        href: '/admin/customers',
        permission: 'installments.customer.view',
      },
      {
        id: 'customers-new',
        label: 'مشتری جدید',
        href: '/admin/customers/new',
        permission: 'installments.customer.create',
      },
      {
        id: 'customers-import',
        label: 'ورود از Excel',
        href: '/admin/customers/import',
        permission: 'installments.customer.import',
      },
    ],
  },
  {
    id: 'installments',
    label: 'اقساط',
    href: '/admin/installments',
    icon: 'CalendarClock',
    permission: 'installments.installment.view',
  },
  {
    id: 'payments',
    label: 'پرداخت‌ها',
    href: '/admin/payments',
    icon: 'CreditCard',
    permission: 'installments.payment.read',
  },
  {
    id: 'sales',
    label: 'فروش‌ها',
    permission: 'installments.sale.view',
    children: [
      {
        id: 'sales-list',
        label: 'لیست فروش‌ها',
        href: '/admin/sales',
        permission: 'installments.sale.view',
      },
      {
        id: 'sales-new',
        label: 'فروش جدید',
        href: '/admin/sales/new',
        permission: 'installments.sale.create',
      },
    ],
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    permission: null,
    children: [
      {
        id: 'reports-overdue',
        label: 'معوقات',
        href: '/admin/reports/overdue',
        permission: 'installments.report.overdue',
      },
      {
        id: 'reports-today-due',
        label: 'سررسید امروز',
        href: '/admin/reports/today-due',
        permission: 'installments.report.dashboard',
      },
    ],
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    permission: null,
    children: [
      {
        id: 'settings-roles',
        label: 'نقش‌ها',
        href: '/admin/roles',
        permission: 'core.role.create',
      },
      {
        id: 'settings-staff',
        label: 'کارمندان',
        href: '/admin/staff',
        permission: 'core.staff.view',
      },
      {
        id: 'settings-branches',
        label: 'شعب',
        href: '/admin/branches',
        permission: 'core.branch.view',
      },
      {
        id: 'settings-installments',
        label: 'اقساط',
        href: '/admin/settings/installments',
        permission: 'core.settings.view',
      },
      {
        id: 'settings-appearance',
        label: 'ظاهر و تم',
        href: '/admin/settings/appearance',
        permission: '',
      },
      {
        id: 'settings-security',
        label: 'امنیت',
        href: '/admin/settings/security',
        permission: '',
      },
    ],
  },
];

/** Route → required permission for page guards (longest prefix wins). */
export const ADMIN_ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string }> = [
  { prefix: '/admin/customers/new', permission: 'installments.customer.create' },
  { prefix: '/admin/customers/import', permission: 'installments.customer.import' },
  { prefix: '/admin/customers/recycle', permission: 'core.recycle.view' },
  { prefix: '/admin/customers', permission: 'installments.customer.view' },
  { prefix: '/admin/installments', permission: 'installments.installment.view' },
  { prefix: '/admin/payments/checks', permission: 'installments.check.read' },
  { prefix: '/admin/payments', permission: 'installments.payment.read' },
  { prefix: '/admin/sales/new', permission: 'installments.sale.create' },
  { prefix: '/admin/sales', permission: 'installments.sale.view' },
  { prefix: '/admin/reports/overdue', permission: 'installments.report.overdue' },
  { prefix: '/admin/reports/today-due', permission: 'installments.report.dashboard' },
  { prefix: '/admin/settings/installments', permission: 'core.settings.view' },
  { prefix: '/admin/settings/reminders', permission: 'installments.reminder.configure' },
  { prefix: '/admin/branches', permission: 'core.branch.view' },
  { prefix: '/admin/roles/new', permission: 'core.role.create' },
  { prefix: '/admin/roles', permission: 'core.role.create' },
  { prefix: '/admin/staff', permission: 'core.staff.view' },
  { prefix: '/admin/dashboard', permission: 'installments.report.dashboard' },
];

export function getRequiredPermissionForPath(pathname: string): string | null {
  const sorted = [...ADMIN_ROUTE_PERMISSIONS].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
  return match?.permission ?? null;
}

export function permissionSetFromList(permissions: string[]): Set<string> {
  return new Set(permissions);
}

export function hasPermission(permissions: Set<string>, code: string): boolean {
  return permissions.has(code);
}

export function hasAnyPermission(permissions: Set<string>, codes: string[]): boolean {
  return codes.some((code) => permissions.has(code));
}

export function filterMenuByPermissions(menu: NavItem[], permissions: string[]): NavItem[] {
  const allowed = permissionSetFromList(permissions);

  return menu
    .map((item) => filterNavItem(item, allowed))
    .filter((item): item is NavItem => item !== null);
}

function filterNavItem(item: NavItem, permissions: Set<string>): NavItem | null {
  if (item.children && item.children.length > 0) {
    const children = item.children.filter(
      (child) => !child.permission || permissions.has(child.permission),
    );

    if (children.length === 0) {
      return null;
    }

    if (item.permission !== null && !permissions.has(item.permission)) {
      return null;
    }

    return { ...item, children };
  }

  if (!item.href) {
    return null;
  }

  if (item.permission !== null && !permissions.has(item.permission)) {
    return null;
  }

  return item;
}

export function getPermissionLabelFa(code: string): string {
  return PERMISSION_LABELS_FA[code] ?? code;
}
