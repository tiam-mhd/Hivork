import type { SaleDetailEnterpriseDto } from '@hivork/contracts/installments';

export type SaleCancelEligibility = {
  allowed: boolean;
  reason?: string;
};

export function canCancelSale(
  hasCancelPermission: boolean,
  sale: Pick<SaleDetailEnterpriseDto, 'status' | 'installments'> | null | undefined,
): SaleCancelEligibility {
  if (!hasCancelPermission) {
    return { allowed: false };
  }

  if (!sale) {
    return { allowed: false };
  }

  if (sale.status !== 'active') {
    return {
      allowed: false,
      reason: sale.status === 'cancelled' ? 'این فروش قبلاً لغو شده است.' : 'فروش تکمیل‌شده قابل لغو نیست.',
    };
  }

  if (sale.installments.some((installment) => installment.status === 'paid')) {
    return {
      allowed: false,
      reason: 'فروش دارای قسط پرداخت‌شده است و قابل لغو نیست.',
    };
  }

  return { allowed: true };
}

export function formatSaleDisplayTitle(sale: Pick<SaleDetailEnterpriseDto, 'id' | 'title'>): string {
  if (sale.title?.trim()) {
    return sale.title.trim();
  }
  return `#${sale.id.slice(0, 8).toUpperCase()}`;
}

export function formatSaleHeading(sale: Pick<SaleDetailEnterpriseDto, 'id' | 'title'>): string {
  return `فروش ${formatSaleDisplayTitle(sale)}`;
}
