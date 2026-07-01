import { ALL_SEED_PERMISSION_CODES } from './permissions.ts';

const ALL = [...ALL_SEED_PERMISSION_CODES];

const MANAGER_DENY = new Set([
  'core.settings.edit',
  'core.role.create',
  'core.role.update',
  'core.role.delete',
  'core.staff.create',
  'core.staff.delete',
]);

const CASHIER_ALLOW = new Set([
  'core.branch.view',
  'installments.sale.view',
  'installments.sale.create',
  'installments.installment.view',
  'installments.payment.view',
  'installments.payment.confirm',
  'installments.customer.view',
]);

function isViewPermission(code: string): boolean {
  const action = code.split('.').pop() ?? '';
  if (action === 'export') return code === 'installments.report.export';
  if (action.startsWith('view')) return true;
  return code === 'installments.report.dashboard' || code === 'installments.report.overdue';
}

export type TemplateRoleCode = 'owner' | 'manager' | 'cashier' | 'viewer';

export type TemplateRoleDef = {
  code: TemplateRoleCode;
  name: string;
  dataScope: 'all' | 'branch' | 'own';
  permissionCodes: string[];
};

export const TEMPLATE_ROLES: TemplateRoleDef[] = [
  {
    code: 'owner',
    name: 'مالک',
    dataScope: 'all',
    permissionCodes: ALL,
  },
  {
    code: 'manager',
    name: 'مدیر',
    dataScope: 'all',
    permissionCodes: ALL.filter((c) => !MANAGER_DENY.has(c)),
  },
  {
    code: 'cashier',
    name: 'صندوقدار',
    dataScope: 'branch',
    permissionCodes: ALL.filter((c) => CASHIER_ALLOW.has(c)),
  },
  {
    code: 'viewer',
    name: 'مشاهده‌گر',
    dataScope: 'branch',
    permissionCodes: ALL.filter(isViewPermission),
  },
];
