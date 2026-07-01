'use client';

import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { Button } from '@hivork/ui';

import { InstallmentPreviewTable } from '@/components/sales/installment-preview-table';
import type { InstallmentPreviewState } from '@/hooks/use-installment-preview';
import { maskPhone } from '@/lib/auth/phone-utils';
import type { SaleFormValues, SelectedSaleCustomer } from '@/lib/schemas/sale-form.schema';

type SaleConfirmStepProps = {
  values: SaleFormValues;
  selectedCustomer: SelectedSaleCustomer;
  branchName: string;
  preview: InstallmentPreviewState;
  loading?: boolean;
  formError?: string | null;
  onBack: () => void;
  onConfirm: () => void;
};

function formatCustomerLine(customer: SelectedSaleCustomer): string {
  const name = customer.name?.trim() || 'بدون نام';
  return `${name} (${maskPhone(customer.phone)})`;
}

export function SaleConfirmStep({
  values,
  selectedCustomer,
  branchName,
  preview,
  loading = false,
  formError = null,
  onBack,
  onConfirm,
}: SaleConfirmStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-neutral-600" aria-live="polite">
        فروش جدید — مرحله ۲ از ۲: تأیید نهایی
      </p>

      {formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <p>
          <span className="text-neutral-600">مشتری:</span>{' '}
          <span className="font-medium text-neutral-900">{formatCustomerLine(selectedCustomer)}</span>
        </p>
        <p>
          <span className="text-neutral-600">شعبه:</span>{' '}
          <span className="font-medium text-neutral-900">{branchName}</span>
        </p>
        {values.title.trim() ? (
          <p>
            <span className="text-neutral-600">عنوان:</span>{' '}
            <span className="font-medium text-neutral-900">{values.title.trim()}</span>
          </p>
        ) : null}
        <p>
          <span className="text-neutral-600">مبلغ کل:</span>{' '}
          <span className="font-medium text-neutral-900">
            {formatToman(BigInt(values.totalAmountRial))}
          </span>
          {' | '}
          <span className="text-neutral-600">پیش‌پرداخت:</span>{' '}
          <span className="font-medium text-neutral-900">
            {formatToman(BigInt(values.downPaymentRial || '0'))}
          </span>
        </p>
        <p>
          {formatPersianDigits(values.installmentCount)} قسط — فاصله{' '}
          {formatPersianDigits(values.intervalDays)} روز
        </p>
        {values.notes.trim() ? (
          <p>
            <span className="text-neutral-600">یادداشت:</span>{' '}
            <span className="text-neutral-900">{values.notes.trim()}</span>
          </p>
        ) : null}
      </div>

      <InstallmentPreviewTable preview={preview} showSumRow={false} />

      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
        ⚠ پس از ثبت، اقساط ایجاد می‌شوند و قابل حذف نیستند.
      </p>

      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
          ← بازگشت و ویرایش
        </Button>
        <Button type="button" onClick={onConfirm} disabled={loading}>
          {loading ? 'در حال ثبت فروش…' : 'ثبت نهایی فروش'}
        </Button>
      </div>
    </div>
  );
}
