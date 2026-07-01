'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';

import { JalaliDatePicker } from '@/components/form/jalali-date-picker';
import { TomanInput } from '@/components/form/toman-input';
import { CustomerCombobox } from '@/components/sales/customer-combobox';
import { InstallmentPreviewTable } from '@/components/sales/installment-preview-table';
import { useInstallmentPreview } from '@/hooks/use-installment-preview';
import type {
  SaleFormFieldErrors,
  SaleFormValues,
  SelectedSaleCustomer,
} from '@/lib/schemas/sale-form.schema';

type SaleCreateFormProps = {
  values: SaleFormValues;
  selectedCustomer: SelectedSaleCustomer | null;
  branches: BranchListItemDto[];
  fieldErrors?: SaleFormFieldErrors;
  formError?: string | null;
  loading?: boolean;
  onValuesChange: (values: SaleFormValues) => void;
  onCustomerChange: (customer: SelectedSaleCustomer | null) => void;
  onContinue: () => void;
};

const selectClassName =
  'min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm';

export function SaleCreateForm({
  values,
  selectedCustomer,
  branches,
  fieldErrors = {},
  formError = null,
  loading = false,
  onValuesChange,
  onCustomerChange,
  onContinue,
}: SaleCreateFormProps) {
  const preview = useInstallmentPreview(values);

  function setField<K extends keyof SaleFormValues>(key: K, value: SaleFormValues[K]) {
    onValuesChange({ ...values, [key]: value });
  }

  function handleCustomerChange(customer: SelectedSaleCustomer | null) {
    onCustomerChange(customer);
    setField('tenantCustomerId', customer?.id ?? '');
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
      noValidate
    >
      <p className="text-sm text-neutral-600" aria-live="polite">
        فروش جدید — مرحله ۱ از ۲
      </p>

      {formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}

      <CustomerCombobox
        value={selectedCustomer}
        onChange={handleCustomerChange}
        disabled={loading}
        error={fieldErrors.tenantCustomerId}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="sale-branch">
          شعبه <span className="text-red-600">*</span>
        </Label>
        <select
          id="sale-branch"
          className={selectClassName}
          value={values.branchId}
          onChange={(event) => setField('branchId', event.target.value)}
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.branchId)}
        >
          <option value="">انتخاب شعبه</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500">شعبه ثبت فروش</p>
        {fieldErrors.branchId ? (
          <p className="text-sm text-red-600">{fieldErrors.branchId}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sale-title">عنوان فروش</Label>
        <Input
          id="sale-title"
          value={values.title}
          onChange={(event) => setField('title', event.target.value)}
          placeholder="مثال: گوشی سامسونگ S23"
          disabled={loading}
        />
        <p className="text-xs text-neutral-500">شرح کالا یا خدمت</p>
      </div>

      <TomanInput
        id="sale-total"
        label="مبلغ کل"
        value={values.totalAmountRial}
        onChange={(rial) => setField('totalAmountRial', rial)}
        helpText="مبلغ کل به تومان"
        required
        disabled={loading}
        error={fieldErrors.totalAmountRial}
      />

      <TomanInput
        id="sale-down-payment"
        label="پیش‌پرداخت"
        value={values.downPaymentRial}
        onChange={(rial) => setField('downPaymentRial', rial)}
        helpText="مبلغ پرداخت نقدی اول"
        disabled={loading}
        error={fieldErrors.downPaymentRial}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="sale-installment-count">
          تعداد اقساط <span className="text-red-600">*</span>
        </Label>
        <Input
          id="sale-installment-count"
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={values.installmentCount}
          onChange={(event) => setField('installmentCount', event.target.value)}
          placeholder="۱۲"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.installmentCount)}
        />
        <p className="text-xs text-neutral-500">بین ۱ تا ۱۲۰</p>
        {fieldErrors.installmentCount ? (
          <p className="text-sm text-red-600">{fieldErrors.installmentCount}</p>
        ) : null}
      </div>

      <JalaliDatePicker
        id="sale-first-due-date"
        label="تاریخ قسط اول"
        value={values.firstDueDate}
        onChange={(isoDate) => setField('firstDueDate', isoDate)}
        helpText="باید در آینده باشد"
        required
        disabled={loading}
        error={fieldErrors.firstDueDate}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="sale-interval-days">
          فاصله اقساط (روز) <span className="text-red-600">*</span>
        </Label>
        <Input
          id="sale-interval-days"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={values.intervalDays}
          onChange={(event) => setField('intervalDays', event.target.value)}
          placeholder="۳۰"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.intervalDays)}
        />
        <p className="text-xs text-neutral-500">بین ۱ تا ۳۶۵ روز</p>
        {fieldErrors.intervalDays ? (
          <p className="text-sm text-red-600">{fieldErrors.intervalDays}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sale-notes">یادداشت</Label>
        <textarea
          id="sale-notes"
          value={values.notes}
          onChange={(event) => setField('notes', event.target.value)}
          rows={3}
          disabled={loading}
          className="min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          placeholder="یادداشت داخلی فروش"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <h2 className="text-base font-semibold text-neutral-900">پیش‌نمایش زنده</h2>
        <InstallmentPreviewTable preview={preview} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !preview.sumMatches}>
          ادامه به تأیید →
        </Button>
      </div>
    </form>
  );
}
