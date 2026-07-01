import type { SaleSummaryDto } from '@hivork/contracts/installments';

export type SaleStatus = SaleSummaryDto['status'];

type SaleStatusPresentation = {
  label: string;
  className: string;
  emoji: string;
};

const SALE_STATUS_PRESENTATION: Record<SaleStatus, SaleStatusPresentation> = {
  active: {
    label: 'فعال',
    className:
      'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
    emoji: '🟢',
  },
  completed: {
    label: 'تکمیل‌شده',
    className: 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300',
    emoji: '✅',
  },
  cancelled: {
    label: 'لغو‌شده',
    className: 'bg-muted text-muted-foreground ring-border',
    emoji: '⚫',
  },
};

export function getSaleStatusPresentation(status: SaleStatus): SaleStatusPresentation {
  return SALE_STATUS_PRESENTATION[status];
}
