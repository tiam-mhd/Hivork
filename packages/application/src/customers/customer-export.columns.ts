import type { TenantCustomerListItem } from '../ports/tenant-customer.repository.port.js';
import { formatRialAsTomanDisplay, formatRialRaw } from '../core/export/export-money.js';
import type { ExportColumnDef } from '../core/export/export.service.js';

export const CUSTOMER_EXPORT_COLUMN_IDS = [
  'displayName',
  'phone',
  'customerCode',
  'categoryName',
  'tags',
  'creditScore',
  'linkStatus',
  'balanceRial',
  'lastPurchaseAt',
  'primaryCity',
  'overdueCount',
  'createdAt',
] as const;

export type CustomerExportColumnId = (typeof CUSTOMER_EXPORT_COLUMN_IDS)[number];

const LINK_STATUS_LABELS: Record<TenantCustomerListItem['linkStatus'], string> = {
  active: 'فعال',
  archived: 'بایگانی',
  blacklisted: 'لیست سیاه',
};

export const CUSTOMER_EXPORT_COLUMNS: ExportColumnDef<TenantCustomerListItem>[] = [
  {
    id: 'displayName',
    header: 'نام',
    headerEn: 'Name',
    width: 24,
    accessor: (row) => row.globalCustomer.name?.trim() || '—',
  },
  {
    id: 'phone',
    header: 'موبایل',
    headerEn: 'Phone',
    width: 14,
    accessor: (row) => row.globalCustomer.phone,
  },
  {
    id: 'customerCode',
    header: 'کد مشتری',
    headerEn: 'Local code',
    width: 14,
    accessor: (row) => row.localCode ?? '—',
  },
  {
    id: 'categoryName',
    header: 'دسته‌بندی',
    headerEn: 'Category',
    width: 16,
    accessor: (row) => row.categoryName ?? '—',
  },
  {
    id: 'tags',
    header: 'برچسب‌ها',
    headerEn: 'Tags',
    width: 18,
    accessor: (row) => row.tags.join(', '),
  },
  {
    id: 'creditScore',
    header: 'امتیاز اعتبار',
    headerEn: 'Credit score',
    width: 12,
    accessor: (row) => row.creditScore,
  },
  {
    id: 'linkStatus',
    header: 'وضعیت',
    headerEn: 'Status',
    width: 12,
    accessor: (row) => LINK_STATUS_LABELS[row.linkStatus] ?? row.linkStatus,
  },
  {
    id: 'balanceRial',
    header: 'مجموع خرید (تومان)',
    headerEn: 'Total purchase (toman)',
    width: 20,
    moneyRial: true,
    accessor: (row) => formatRialAsTomanDisplay(row.totalPurchaseRial),
  },
  {
    id: 'balanceRialRaw',
    header: 'مجموع خرید (ریال)',
    headerEn: 'Total purchase (rial)',
    width: 18,
    moneyRial: true,
    accessor: (row) => formatRialRaw(row.totalPurchaseRial),
  },
  {
    id: 'lastPurchaseAt',
    header: 'آخرین خرید',
    headerEn: 'Last purchase',
    width: 16,
    accessor: (row) => (row.lastPurchaseAt ? row.lastPurchaseAt.toISOString().slice(0, 10) : '—'),
  },
  {
    id: 'primaryCity',
    header: 'شهر',
    headerEn: 'Primary city',
    width: 14,
    accessor: (row) => row.primaryAddressCity ?? '—',
  },
  {
    id: 'overdueCount',
    header: 'تعداد معوق',
    headerEn: 'Overdue count',
    width: 12,
    accessor: (row) => row.overdueCount,
  },
  {
    id: 'createdAt',
    header: 'تاریخ ثبت',
    headerEn: 'Created at',
    width: 16,
    accessor: (row) => row.createdAt.toISOString().slice(0, 10),
  },
];

/** IFP-042 default export columns (enterprise list fields). */
export const CUSTOMER_EXPORT_DEFAULT_COLUMN_IDS: CustomerExportColumnId[] = [
  'displayName',
  'phone',
  'customerCode',
  'categoryName',
  'tags',
  'creditScore',
  'linkStatus',
  'balanceRial',
  'lastPurchaseAt',
  'primaryCity',
];

export function resolveCustomerExportColumns(
  requested?: string[],
): ExportColumnDef<TenantCustomerListItem>[] {
  const allowed = new Map(CUSTOMER_EXPORT_COLUMNS.map((column) => [column.id, column]));

  if (!requested?.length) {
    return CUSTOMER_EXPORT_DEFAULT_COLUMN_IDS.map((id) => allowed.get(id)!);
  }

  const resolved: ExportColumnDef<TenantCustomerListItem>[] = [];
  for (const id of requested) {
    const column = allowed.get(id);
    if (!column) {
      return [];
    }
    resolved.push(column);
  }

  return resolved;
}
