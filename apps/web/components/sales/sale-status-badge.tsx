'use client';

import type { SaleStatusDto } from '@hivork/contracts/installments';

import { getSaleStatusPresentation } from '@/lib/sales/sale-status';

type SaleStatusBadgeProps = {
  status: SaleStatusDto;
};

export function SaleStatusBadge({ status }: SaleStatusBadgeProps) {
  const { label, className, emoji } = getSaleStatusPresentation(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
