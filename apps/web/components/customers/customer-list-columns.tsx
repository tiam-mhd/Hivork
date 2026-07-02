'use client';


import type { TenantCustomerListItemDto } from '@hivork/contracts/customers';
import { formatIsoDateAsJalali, formatPersianDigits } from '@hivork/i18n';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CustomerStatusBadge } from '@/components/customers/customer-status-badge';
import { TagBadge } from '@/components/customers/tag-badge';
import type { DataTableColumnDef } from '@/components/data-table';
import { maskPhone } from '@/lib/auth/phone-utils';

function formatCustomerName(name: string | null): string {
  return name?.trim() ? name.trim() : '—';
}

function formatLastPurchase(lastPurchaseAt: string | null): string {
  if (!lastPurchaseAt) {
    return '—';
  }
  return formatIsoDateAsJalali(lastPurchaseAt.slice(0, 10));
}

export function createCustomerListColumns(
  canUpdate: boolean,
): DataTableColumnDef<TenantCustomerListItemDto>[] {
  return [
    {
      id: 'name',
      header: 'نام',
      sortable: true,
      cell: ({ row }) => (
        <span className="font-medium">{formatCustomerName(row.globalCustomer.name)}</span>
      ),
    },
    {
      id: 'phone',
      header: 'شماره',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{maskPhone(row.globalCustomer.phone)}</span>
      ),
    },
    {
      id: 'localCode',
      header: 'کد',
      hideOnMobile: true,
      cell: ({ row }) => row.localCode ?? '—',
    },
    {
      id: 'categoryName',
      header: 'دسته‌بندی',
      hideOnMobile: true,
      cell: ({ row }) => row.categoryName ?? '—',
    },
    {
      id: 'tags',
      header: 'برچسب',
      hideOnMobile: true,
      cell: ({ row }) =>
        row.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <TagBadge key={tag} label={tag} />
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      id: 'creditScore',
      header: 'امتیاز',
      align: 'end',
      hideOnMobile: true,
      cell: ({ row }) => formatPersianDigits(row.creditScore),
    },
    {
      id: 'linkStatus',
      header: 'وضعیت',
      hideOnMobile: true,
      cell: ({ row }) => (
        <CustomerStatusBadge linkStatus={row.linkStatus} isBlacklisted={row.isBlacklisted} />
      ),
    },
    {
      id: 'overdueCount',
      header: 'معوقات',
      sortable: true,
      align: 'end',
      cell: ({ row }) => formatPersianDigits(row.overdueCount),
    },
    {
      id: 'lastPurchaseAt',
      header: 'آخرین خرید',
      sortable: true,
      hideOnMobile: true,
      cell: ({ row }) => formatLastPurchase(row.lastPurchaseAt),
    },
    {
      id: 'createdAt',
      header: 'تاریخ ثبت',
      sortable: true,
      hideOnMobile: true,
      cell: ({ row }) => formatIsoDateAsJalali(row.createdAt.slice(0, 10)),
    },
    {
      id: 'actions',
      header: 'عملیات',
      align: 'end',
      width: '4.5rem',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex flex-col items-end gap-1">
          <Link
            href={`/admin/customers/${row.id}`}
            className="text-sm text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            مشاهده
          </Link>
          {canUpdate ? (
            <Link
              href={`/admin/customers/${row.id}/edit`}
              className="text-xs text-muted-foreground hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              ویرایش
            </Link>
          ) : null}
        </div>
      ),
    },
  ];
}

export function renderCustomerMobileCard(row: TenantCustomerListItemDto): ReactNode {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground">{formatCustomerName(row.globalCustomer.name)}</p>
        <CustomerStatusBadge linkStatus={row.linkStatus} isBlacklisted={row.isBlacklisted} />
      </div>
      <p className="font-mono text-muted-foreground" dir="ltr">
        {maskPhone(row.globalCustomer.phone)}
      </p>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>امتیاز: {formatPersianDigits(row.creditScore)}</span>
        <span>معوقات: {formatPersianDigits(row.overdueCount)}</span>
      </div>
      {row.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.tags.map((tag) => (
            <TagBadge key={tag} label={tag} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
