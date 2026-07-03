import type {
  PaymentLedgerEntryStatusDto,
  PaymentLedgerEntryTypeDto,
} from '@hivork/contracts/payments';

export const PAYMENT_ENTRY_TYPE_LABELS: Record<PaymentLedgerEntryTypeDto, string> = {
  payment_in: 'دریافت',
  payment_out: 'پرداخت',
  refund: 'استرداد',
  fee: 'کارمزد',
  penalty: 'جریمه',
  discount: 'تخفیف',
  adjustment: 'تعدیل',
  settlement: 'تسویه',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentLedgerEntryStatusDto, string> = {
  posted: 'ثبت‌شده',
  voided: 'ابطال‌شده',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقد',
  bank_transfer: 'انتقال بانکی',
  card: 'کارت',
  pos: 'پوز',
  check: 'چک',
  online: 'آنلاین',
  wallet: 'کیف پول',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
