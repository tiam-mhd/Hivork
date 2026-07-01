'use client';

import type { TenantCustomerListItemDto } from '@hivork/contracts/customers';
import { formatIsoDateAsJalali, formatPersianDigits } from '@hivork/i18n';
import { cn } from '@hivork/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TagBadge } from '@/components/customers/tag-badge';
import { maskPhone } from '@/lib/auth/phone-utils';

type CustomerTableProps = {
  items: TenantCustomerListItemDto[];
  canUpdate?: boolean;
};

const STICKY_ACTIONS_HEADER =
  'sticky end-0 z-20 min-w-[3.25rem] bg-muted/40 px-3 py-3 shadow-[-8px_0_16px_-10px_hsl(var(--foreground)/0.15)]';
const STICKY_ACTIONS_CELL =
  'sticky end-0 z-10 min-w-[3.25rem] bg-card px-3 py-3 shadow-[-8px_0_16px_-10px_hsl(var(--foreground)/0.12)]';

function formatCustomerName(name: string | null): string {
  return name?.trim() ? name.trim() : '—';
}

function formatLastPurchase(lastPurchaseAt: string | null): string {
  if (!lastPurchaseAt) {
    return '—';
  }
  return formatIsoDateAsJalali(lastPurchaseAt.slice(0, 10));
}

function CustomerRowActions({
  customerId,
  canUpdate,
}: {
  customerId: string;
  canUpdate: boolean;
}) {
  const editHref = `/admin/customers/${customerId}/edit`;

  return (
    <details className="relative inline-block text-start" onClick={(e) => e.stopPropagation()}>
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
        aria-label="عملیات"
      >
        ⋮
      </summary>
      <div className="absolute end-0 z-30 mt-1 min-w-36 rounded-lg border border-border bg-card py-1 text-card-foreground shadow-lg">
        <Link
          href={editHref}
          className="block px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
        >
          مشاهده
        </Link>
        {canUpdate ? (
          <Link
            href={editHref}
            className="block px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            ویرایش
          </Link>
        ) : null}
      </div>
    </details>
  );
}

export function CustomerTable({ items, canUpdate = false }: CustomerTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">نام</th>
              <th className="px-4 py-3">شماره</th>
              <th className="hidden px-4 py-3 md:table-cell">کد</th>
              <th className="hidden px-4 py-3 lg:table-cell">برچسب</th>
              <th className="px-4 py-3">معوقات</th>
              <th className="hidden px-4 py-3 sm:table-cell">آخرین خرید</th>
              <th className={cn(STICKY_ACTIONS_HEADER)}>
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const editHref = `/admin/customers/${item.id}/edit`;
              const rowMuted = index % 2 === 1;

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40',
                    rowMuted && 'bg-muted/10',
                  )}
                  onClick={() => router.push(editHref)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(editHref);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`مشاهده مشتری ${formatCustomerName(item.globalCustomer.name)}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatCustomerName(item.globalCustomer.name)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground" dir="ltr">
                    {maskPhone(item.globalCustomer.phone)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {item.localCode ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.length > 0 ? (
                        item.tags.map((tag) => <TagBadge key={tag} label={tag} />)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatPersianDigits(item.overdueCount)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {formatLastPurchase(item.lastPurchaseAt)}
                  </td>
                  <td
                    className={cn(
                      STICKY_ACTIONS_CELL,
                      rowMuted && 'bg-muted/10',
                      'text-end',
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CustomerRowActions customerId={item.id} canUpdate={canUpdate} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
