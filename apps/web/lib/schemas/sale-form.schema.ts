import type { CreateSaleDto } from '@hivork/contracts/installments';
import { startOfUtcDay } from '@hivork/domain/installments/browser';

import { FA_FORM } from '@/lib/i18n';

export type SaleFormValues = {
  tenantCustomerId: string;
  branchId: string;
  title: string;
  totalAmountRial: string;
  downPaymentRial: string;
  installmentCount: string;
  firstDueDate: string;
  intervalDays: string;
  notes: string;
};

export type SaleFormFieldErrors = Partial<Record<keyof SaleFormValues | 'form', string>>;

export type SelectedSaleCustomer = {
  id: string;
  name: string | null;
  phone: string;
};

export const EMPTY_SALE_FORM_VALUES: SaleFormValues = {
  tenantCustomerId: '',
  branchId: '',
  title: '',
  totalAmountRial: '0',
  downPaymentRial: '0',
  installmentCount: '4',
  firstDueDate: '',
  intervalDays: '30',
  notes: '',
};

function parsePositiveBigInt(value: string): bigint | null {
  try {
    const parsed = BigInt(value.trim() || '0');
    if (parsed < 0n) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function todayContractDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateSaleForm(values: SaleFormValues): SaleFormFieldErrors {
  const errors: SaleFormFieldErrors = {};

  if (!values.tenantCustomerId.trim()) {
    errors.tenantCustomerId = 'انتخاب مشتری الزامی است.';
  }

  if (!values.branchId.trim()) {
    errors.branchId = 'انتخاب شعبه الزامی است.';
  }

  const total = parsePositiveBigInt(values.totalAmountRial);
  if (total === null || total <= 0n) {
    errors.totalAmountRial = FA_FORM.AMOUNT_REQUIRED;
  }

  const down = parsePositiveBigInt(values.downPaymentRial) ?? null;
  if (down === null) {
    errors.downPaymentRial = 'مبلغ پیش‌پرداخت معتبر نیست.';
  } else if (total !== null && down > total) {
    errors.downPaymentRial = 'پیش‌پرداخت نمی‌تواند بیشتر از مبلغ کل باشد.';
  }

  const installmentCount = parsePositiveInt(values.installmentCount);
  if (installmentCount === null || installmentCount < 1 || installmentCount > 120) {
    errors.installmentCount = 'تعداد اقساط باید بین ۱ تا ۱۲۰ باشد.';
  }

  if (total !== null && down !== null && installmentCount !== null) {
    const remaining = total - down;
    if (remaining === 0n && installmentCount !== 1) {
      errors.installmentCount = 'در صورت پرداخت کامل، فقط یک قسط صفر مجاز است.';
    }
  }

  const intervalDays = parsePositiveInt(values.intervalDays);
  if (intervalDays === null || intervalDays < 1 || intervalDays > 365) {
    errors.intervalDays = 'فاصله اقساط باید بین ۱ تا ۳۶۵ روز باشد.';
  }

  if (!values.firstDueDate.trim()) {
    errors.firstDueDate = FA_FORM.FIELD_REQUIRED;
  } else {
    const dueDate = new Date(`${values.firstDueDate}T00:00:00.000Z`);
    if (Number.isNaN(dueDate.getTime())) {
      errors.firstDueDate = 'تاریخ قسط اول معتبر نیست.';
    } else if (startOfUtcDay(dueDate) <= startOfUtcDay(new Date())) {
      errors.firstDueDate = 'تاریخ قسط اول باید در آینده باشد.';
    }
  }

  return errors;
}

export function formValuesToCreateDto(values: SaleFormValues): CreateSaleDto {
  const title = values.title.trim();
  const notes = values.notes.trim();

  return {
    tenantCustomerId: values.tenantCustomerId,
    branchId: values.branchId,
    ...(title ? { title } : {}),
    ...(notes ? { description: notes } : {}),
    totalAmountRial: values.totalAmountRial,
    downPaymentRial: values.downPaymentRial || '0',
    installmentCount: Number(values.installmentCount),
    firstDueDate: values.firstDueDate,
    contractDate: todayContractDateIso(),
    intervalDays: Number(values.intervalDays),
  };
}

export function mapSaleApiErrorToFieldErrors(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): SaleFormFieldErrors {
  const field = typeof details?.field === 'string' ? details.field : undefined;
  if (field === 'tenantCustomerId') {
    return { tenantCustomerId: message };
  }
  if (field === 'branchId') {
    return { branchId: message };
  }
  if (field === 'totalAmountRial' || field === 'downPaymentRial') {
    return { [field]: message };
  }
  if (field === 'installmentCount') {
    return { installmentCount: message };
  }
  if (field === 'firstDueDate') {
    return { firstDueDate: message };
  }
  if (field === 'intervalDays') {
    return { intervalDays: message };
  }

  if (code === 'CUSTOMER_NOT_FOUND') {
    return { tenantCustomerId: 'مشتری یافت نشد.' };
  }
  if (code === 'BRANCH_ACCESS_DENIED' || code === 'BRANCH_NOT_ALLOWED') {
    return { branchId: 'شما به این شعبه دسترسی ندارید.' };
  }
  if (code === 'AMOUNT_EXCEEDS_TOTAL' || code === 'DOWN_PAYMENT_EXCEEDS_TOTAL') {
    return { downPaymentRial: message };
  }
  if (code === 'INSTALLMENT_COUNT_INVALID') {
    return { installmentCount: message };
  }
  if (code === 'INTERVAL_INVALID') {
    return { intervalDays: message };
  }
  if (code === 'DUE_DATE_IN_PAST') {
    return { firstDueDate: message };
  }

  return {};
}

export function saleFormsAreEqual(a: SaleFormValues, b: SaleFormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildSalePreviewInput(values: SaleFormValues) {
  const total = parsePositiveBigInt(values.totalAmountRial);
  const down = parsePositiveBigInt(values.downPaymentRial) ?? 0n;
  const installmentCount = parsePositiveInt(values.installmentCount);
  const intervalDays = parsePositiveInt(values.intervalDays);

  if (
    total === null ||
    total <= 0n ||
    down > total ||
    installmentCount === null ||
    installmentCount < 1 ||
    intervalDays === null ||
    intervalDays < 1 ||
    !values.firstDueDate.trim()
  ) {
    return null;
  }

  const remaining = total - down;
  if (remaining === 0n && installmentCount !== 1) {
    return null;
  }

  const firstDueDate = new Date(`${values.firstDueDate}T00:00:00.000Z`);
  if (Number.isNaN(firstDueDate.getTime())) {
    return null;
  }

  return {
    totalAmountRial: total,
    downPaymentRial: down,
    installmentCount,
    firstDueDate,
    intervalDays,
  };
}
