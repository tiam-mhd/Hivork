import type { InstallmentInSaleDto, SaleDetailDto } from '@hivork/contracts/installments';

export type InstallmentDisplayStatus = InstallmentInSaleDto['status'] | 'cancelled';

type InstallmentStatusPresentation = {
  label: string;
  className: string;
  emoji: string;
  strikethrough?: boolean;
};

const INSTALLMENT_STATUS_PRESENTATION: Record<InstallmentDisplayStatus, InstallmentStatusPresentation> = {
  pending: {
    label: 'در انتظار',
    className: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300',
    emoji: '🔵',
  },
  paid: {
    label: 'پرداخت‌شده',
    className:
      'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
    emoji: '✅',
  },
  overdue: {
    label: 'معوق',
    className: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
    emoji: '🔴',
  },
  waived: {
    label: 'بخشوده',
    className: 'bg-muted text-muted-foreground ring-border',
    emoji: '⚪',
  },
  cancelled: {
    label: 'لغو',
    className: 'bg-muted text-muted-foreground ring-border',
    emoji: '—',
    strikethrough: true,
  },
};

export function resolveInstallmentDisplayStatus(
  installmentStatus: InstallmentInSaleDto['status'],
  saleStatus: SaleDetailDto['status'],
): InstallmentDisplayStatus {
  if (saleStatus === 'cancelled') {
    return 'cancelled';
  }
  return installmentStatus;
}

export function getInstallmentStatusPresentation(
  status: InstallmentDisplayStatus,
): InstallmentStatusPresentation {
  return INSTALLMENT_STATUS_PRESENTATION[status];
}
