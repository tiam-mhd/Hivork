'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import type { SaleSummaryDto } from '@hivork/contracts/installments';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { cn } from '@hivork/ui';
import { useRouter } from 'next/navigation';

import { SaleStatusBadge } from '@/components/sales/sale-status-badge';
import { formatIsoDateAsJalali } from '@/lib/i18n';

type SaleTableProps = {
  items: SaleSummaryDto[];
  branches: BranchListItemDto[];
};

function formatSaleTitle(sale: SaleSummaryDto): string {
  if (sale.title?.trim()) {
    return sale.title.trim();
  }
  return `فروش ${sale.id.slice(0, 8)}`;
}

function formatCustomerName(sale: SaleSummaryDto): string {
  return sale.customer?.name?.trim() ? sale.customer.name.trim() : '—';
}

function formatContractDate(contractDate: string | undefined): string {
  if (!contractDate) {
    return '—';
  }
  return formatIsoDateAsJalali(contractDate.slice(0, 10));
}

function formatInstallmentProgress(sale: SaleSummaryDto): string {
  const paid = sale.paidCount ?? 0;
  return `${formatPersianDigits(paid)}/${formatPersianDigits(sale.installmentCount)}`;
}

function resolveBranchName(branchId: string, branches: BranchListItemDto[]): string {
  return branches.find((branch) => branch.id === branchId)?.name ?? '—';
}

export function SaleTable({ items, branches }: SaleTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">عنوان</th>
              <th className="px-4 py-3">مشتری</th>
              <th className="px-4 py-3">مبلغ کل</th>
              <th className="hidden px-4 py-3 sm:table-cell">اقساط</th>
              <th className="px-4 py-3">وضعیت</th>
              <th className="hidden px-4 py-3 md:table-cell">تاریخ قرارداد</th>
              <th className="hidden px-4 py-3 lg:table-cell">شعبه</th>
            </tr>
          </thead>
          <tbody>
            {items.map((sale, index) => (
              <tr
                key={sale.id}
                className={cn(
                  'cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40',
                  index % 2 === 1 && 'bg-muted/10',
                )}
                onClick={() => router.push(`/admin/sales/${sale.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/admin/sales/${sale.id}`);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`مشاهده فروش ${formatSaleTitle(sale)}`}
              >
                <td className="px-4 py-3 font-medium text-foreground">{formatSaleTitle(sale)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCustomerName(sale)}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {formatToman(BigInt(sale.totalAmountRial))}
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">
                  {formatInstallmentProgress(sale)}
                </td>
                <td className="px-4 py-3">
                  <SaleStatusBadge status={sale.status} />
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {formatContractDate(sale.contractDate)}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {resolveBranchName(sale.branchId, branches)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SaleTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy="true"
      aria-label="در حال بارگذاری لیست فروش‌ها"
    >
      <div className="flex flex-col gap-0 divide-y divide-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
