'use client';

import type { InstallmentInSaleDto, SaleDetailDto } from '@hivork/contracts/installments';

import {
  getInstallmentStatusPresentation,
  resolveInstallmentDisplayStatus,
} from '@/lib/sales/installment-status';

type InstallmentStatusBadgeProps = {
  installment: InstallmentInSaleDto;
  saleStatus: SaleDetailDto['status'];
};

export function InstallmentStatusBadge({ installment, saleStatus }: InstallmentStatusBadgeProps) {
  const displayStatus = resolveInstallmentDisplayStatus(installment.status, saleStatus);
  const { label, className, emoji, strikethrough } =
    getInstallmentStatusPresentation(displayStatus);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className} ${strikethrough ? 'line-through' : ''}`}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
