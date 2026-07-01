'use client';


import type { BranchListItemDto } from '@hivork/contracts';
import type { SaleDetailDto } from '@hivork/contracts/installments';
import { formatIsoDateAsJalali, formatPersianDigits, formatToman } from '@hivork/i18n';
import { Button, Card, CardContent } from '@hivork/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SaleStatusBadge } from '@/components/sales/sale-status-badge';
import { maskPhone } from '@/lib/auth/phone-utils';
import { canCancelSale, formatSaleHeading } from '@/lib/sales/sale-cancel.utils';

type SaleDetailHeaderProps = {
  sale: SaleDetailDto;
  branches: BranchListItemDto[];
  canCancelPermission: boolean;
  onCancelClick: () => void;
};

function resolveBranchName(branchId: string, branches: BranchListItemDto[]): string {
  return branches.find((branch) => branch.id === branchId)?.name ?? '—';
}

function formatCustomerName(name: string | null | undefined): string {
  return name?.trim() ? name.trim() : 'بدون نام';
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function SaleDetailHeader({
  sale,
  branches,
  canCancelPermission,
  onCancelClick,
}: SaleDetailHeaderProps) {
  const cancelEligibility = canCancelSale(canCancelPermission, sale);
  const customer = sale.customer;
  const customerHref = `/admin/customers/${sale.tenantCustomerId}/edit`;
  const paidCount = sale.installments.filter((item) => item.status === 'paid').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground">
          <Link href="/admin/sales">← بازگشت به لیست</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {formatSaleHeading(sale)}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <SaleStatusBadge status={sale.status} />
            <span className="text-sm text-muted-foreground">
              {formatPersianDigits(paidCount)}/{formatPersianDigits(sale.installmentCount)} قسط
              پرداخت‌شده
            </span>
          </div>
        </div>

        {cancelEligibility.allowed ? (
          <Button type="button" variant="outline" className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={onCancelClick}>
            لغو فروش
          </Button>
        ) : cancelEligibility.reason && canCancelPermission && sale.status === 'active' ? (
          <span className="text-sm text-muted-foreground" title={cancelEligibility.reason}>
            لغو فروش غیرفعال است
          </span>
        ) : null}
      </div>

      {sale.status === 'cancelled' ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          این فروش لغو شده است.
          {sale.cancelReason ? (
            <span className="mt-1 block text-foreground/80">دلیل: {sale.cancelReason}</span>
          ) : null}
        </div>
      ) : null}

      <Card className="border-border bg-card/80 shadow-sm">
        <CardContent className="p-5">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="شعبه">{resolveBranchName(sale.branchId, branches)}</DetailItem>

            <DetailItem label="مشتری">
              {customer ? (
                <Link
                  href={customerHref}
                  className="inline-flex flex-wrap items-center gap-x-2 text-primary hover:underline"
                >
                  <span>{formatCustomerName(customer.name)}</span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {maskPhone(customer.phone)}
                  </span>
                </Link>
              ) : (
                <Link href={customerHref} className="text-primary hover:underline">
                  مشاهده مشتری
                </Link>
              )}
            </DetailItem>

            <DetailItem label="تاریخ قرارداد">
              {sale.contractDate
                ? formatIsoDateAsJalali(sale.contractDate.slice(0, 10))
                : '—'}
            </DetailItem>

            <DetailItem label="تاریخ ایجاد">
              {formatIsoDateAsJalali(sale.createdAt.slice(0, 10))}
            </DetailItem>

            <DetailItem label="مبلغ کل">
              <span className="tabular-nums">{formatToman(BigInt(sale.totalAmountRial))}</span>
            </DetailItem>

            <DetailItem label="پیش‌پرداخت">
              <span className="tabular-nums">{formatToman(BigInt(sale.downPaymentRial))}</span>
            </DetailItem>

            {sale.invoiceNumber?.trim() ? (
              <DetailItem label="شماره فاکتور">{sale.invoiceNumber.trim()}</DetailItem>
            ) : null}

            {sale.description?.trim() ? (
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium text-muted-foreground">یادداشت</dt>
                <dd className="text-sm text-foreground/90">{sale.description.trim()}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export function SaleDetailHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="در حال بارگذاری جزئیات فروش">
      <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="h-36 animate-pulse rounded-xl border border-border bg-muted/30" />
    </div>
  );
}
