'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button, Input, Label } from '@hivork/ui';
import { useId, type ReactNode } from 'react';

import { DatePicker } from '@/components/date-picker';
import {
  buildContractNumberPreview,
  type InstallmentsSettingsFieldErrors,
  type InstallmentsSettingsFormValues,
} from '@/lib/settings/installments-settings';

type InstallmentsSettingsFormProps = {
  values: InstallmentsSettingsFormValues;
  fieldErrors?: InstallmentsSettingsFieldErrors;
  disabled?: boolean;
  saving?: boolean;
  isDirty?: boolean;
  canEdit?: boolean;
  onChange: (next: InstallmentsSettingsFormValues) => void;
  onSubmit: () => void;
  onReset: () => void;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function FormField({
  label,
  htmlFor,
  help,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border-border"
      />
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {help ? <span className="text-xs text-muted-foreground">{help}</span> : null}
      </span>
    </label>
  );
}

function updateCustomHolidayDate(
  values: InstallmentsSettingsFormValues,
  index: number,
  nextValue: string,
): InstallmentsSettingsFormValues {
  const nextDates = [...values.custom_holiday_dates];
  nextDates[index] = nextValue;
  return {
    ...values,
    custom_holiday_dates: nextDates.filter(Boolean),
  };
}

export function InstallmentsSettingsForm({
  values,
  fieldErrors = {},
  disabled = false,
  saving = false,
  isDirty = false,
  canEdit = true,
  onChange,
  onSubmit,
  onReset,
}: InstallmentsSettingsFormProps) {
  const formId = useId();
  const contractPreview = buildContractNumberPreview(values);
  const readOnly = disabled || saving || !canEdit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <SectionCard
        title="یادآورها و فرمول"
        description="زمان‌بندی یادآورها و فرمول محاسبه اقساط را در این بخش تنظیم کنید."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="فرمول محاسبه" htmlFor={`${formId}-formula`}>
            <select
              id={`${formId}-formula`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.calculation_formula}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, calculation_formula: event.target.value as typeof values.calculation_formula })
              }
            >
              <option value="equal_installments">اقساط مساوی</option>
              <option value="simple_interest">بهره ساده</option>
              <option value="rule78">قاعده ۷۸</option>
              <option value="custom">سفارشی</option>
            </select>
          </FormField>
          <FormField
            label="ساعت ارسال یادآور"
            htmlFor={`${formId}-reminder-time`}
            help="به وقت تهران"
            error={fieldErrors.reminder_time}
          >
            <Input
              id={`${formId}-reminder-time`}
              type="time"
              dir="ltr"
              value={values.reminder_time}
              disabled={readOnly}
              onChange={(event) => onChange({ ...values, reminder_time: event.target.value })}
            />
          </FormField>
        </div>
        <ToggleRow
          checked={values.reminder_on_due_date}
          disabled={readOnly}
          onChange={(checked) => onChange({ ...values, reminder_on_due_date: checked })}
          label="ارسال یادآور در روز سررسید"
        />
      </SectionCard>

      <SectionCard
        title="جریمه و سود"
        description="مبنای جریمه تاخیر و نرخ سود سالانه قرارداد را مشخص کنید."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="نوع جریمه" htmlFor={`${formId}-penalty-type`}>
            <select
              id={`${formId}-penalty-type`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.penalty_type}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, penalty_type: event.target.value as typeof values.penalty_type })
              }
            >
              <option value="none">بدون جریمه</option>
              <option value="percent_daily">درصد روزانه</option>
              <option value="percent_monthly">درصد ماهانه</option>
              <option value="fixed_daily">مبلغ ثابت روزانه</option>
            </select>
          </FormField>
          <FormField
            label="مهلت جریمه"
            htmlFor={`${formId}-penalty-grace`}
            help="تعداد روز مهلت قبل از شروع جریمه"
          >
            <Input
              id={`${formId}-penalty-grace`}
              type="number"
              min={0}
              max={30}
              value={values.penalty_grace_days}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, penalty_grace_days: Number(event.target.value || 0) })
              }
            />
          </FormField>
          <FormField
            label="نرخ جریمه (bps)"
            htmlFor={`${formId}-penalty-rate`}
            help="هر 100 واحد پایه برابر 1 درصد است."
            error={fieldErrors.penalty_rate_bps}
          >
            <Input
              id={`${formId}-penalty-rate`}
              type="number"
              min={0}
              max={10000}
              value={values.penalty_rate_bps}
              disabled={readOnly}
              onChange={(event) => onChange({ ...values, penalty_rate_bps: Number(event.target.value || 0) })}
            />
          </FormField>
          <FormField
            label="مبلغ جریمه ثابت روزانه (ریال)"
            htmlFor={`${formId}-penalty-fixed`}
            error={fieldErrors.penalty_fixed_rial}
          >
            <Input
              id={`${formId}-penalty-fixed`}
              inputMode="numeric"
              value={values.penalty_fixed_rial}
              disabled={readOnly}
              onChange={(event) => onChange({ ...values, penalty_fixed_rial: event.target.value })}
            />
          </FormField>
          <FormField
            label="نرخ سود سالانه (bps)"
            htmlFor={`${formId}-interest-rate`}
            help="مثال: 1800 یعنی 18 درصد"
          >
            <Input
              id={`${formId}-interest-rate`}
              type="number"
              min={0}
              max={10000}
              value={values.interest_rate_bps_annual}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, interest_rate_bps_annual: Number(event.target.value || 0) })
              }
            />
          </FormField>
          <FormField label="روش محاسبه سود" htmlFor={`${formId}-interest-method`}>
            <select
              id={`${formId}-interest-method`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.interest_calculation_method}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...values,
                  interest_calculation_method: event.target.value as typeof values.interest_calculation_method,
                })
              }
            >
              <option value="none">بدون سود</option>
              <option value="flat">ثابت</option>
              <option value="reducing">کاهشی</option>
            </select>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        title="گرد کردن و تعطیلات"
        description="رفتار گرد کردن مبالغ و مدیریت تعطیلات برنامه اقساط را کنترل کنید."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="حالت گرد کردن" htmlFor={`${formId}-rounding-mode`}>
            <select
              id={`${formId}-rounding-mode`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.rounding_mode}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, rounding_mode: event.target.value as typeof values.rounding_mode })
              }
            >
              <option value="nearest">نزدیک‌ترین</option>
              <option value="up">به بالا</option>
              <option value="down">به پایین</option>
            </select>
          </FormField>
          <FormField
            label="واحد گرد کردن (ریال)"
            htmlFor={`${formId}-rounding-unit`}
            help={`نمونه: ${formatPersianDigits(values.rounding_unit_rial)} ریال`}
            error={fieldErrors.rounding_unit_rial}
          >
            <select
              id={`${formId}-rounding-unit`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.rounding_unit_rial}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, rounding_unit_rial: event.target.value as typeof values.rounding_unit_rial })
              }
            >
              <option value="1">1</option>
              <option value="10">10</option>
              <option value="100">100</option>
              <option value="1000">1000</option>
              <option value="10000">10000</option>
            </select>
          </FormField>
          <FormField label="منبع تعطیلات" htmlFor={`${formId}-holiday-source`}>
            <select
              id={`${formId}-holiday-source`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.holiday_calendar_source}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...values,
                  holiday_calendar_source: event.target.value as typeof values.holiday_calendar_source,
                })
              }
            >
              <option value="official_only">فقط رسمی</option>
              <option value="custom_only">فقط سفارشی</option>
              <option value="merge_official_and_custom">رسمی + سفارشی</option>
            </select>
          </FormField>
          <ToggleRow
            checked={values.skip_holidays_in_schedule}
            disabled={readOnly}
            onChange={(checked) => onChange({ ...values, skip_holidays_in_schedule: checked })}
            label="جابجایی اقساط از روزهای تعطیل"
            help="در صورت فعال بودن، اقساط روی نزدیک‌ترین روز کاری بعدی قرار می‌گیرند."
          />
        </div>
        <div className="grid gap-3">
          <p className="text-sm font-medium text-foreground">تعطیلات سفارشی</p>
          {values.custom_holiday_dates.map((date, index) => (
            <div key={`${date}-${index}`} className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <DatePicker
                  value={date}
                  onChange={(next) => onChange(updateCustomHolidayDate(values, index, next ?? ''))}
                  label={`تعطیلی ${formatPersianDigits(index + 1)}`}
                  calendar="jalali"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={readOnly}
                onClick={() =>
                  onChange({
                    ...values,
                    custom_holiday_dates: values.custom_holiday_dates.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                حذف
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={readOnly}
              onClick={() =>
                onChange({
                  ...values,
                  custom_holiday_dates: [...values.custom_holiday_dates, new Date().toISOString().slice(0, 10)],
                })
              }
            >
              افزودن تعطیلی
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="تقویم و شماره‌گذاری"
        description="نحوه نمایش تاریخ‌ها و الگوی شماره قراردادهای جدید را مدیریت کنید."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="تقویم نمایش" htmlFor={`${formId}-display-calendar`}>
            <select
              id={`${formId}-display-calendar`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.calendar_display_mode}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...values,
                  calendar_display_mode: event.target.value as typeof values.calendar_display_mode,
                })
              }
            >
              <option value="jalali">جلالی</option>
              <option value="gregorian">میلادی</option>
            </select>
          </FormField>
          <FormField label="تقویم ورود" htmlFor={`${formId}-input-calendar`}>
            <select
              id={`${formId}-input-calendar`}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={values.calendar_input_mode}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...values,
                  calendar_input_mode: event.target.value as typeof values.calendar_input_mode,
                })
              }
            >
              <option value="jalali">جلالی</option>
              <option value="gregorian">میلادی</option>
            </select>
          </FormField>
          <ToggleRow
            checked={values.contract_numbering_enabled}
            disabled={readOnly}
            onChange={(checked) => onChange({ ...values, contract_numbering_enabled: checked })}
            label="فعال بودن شماره‌گذاری خودکار"
          />
          <ToggleRow
            checked={values.contract_number_include_year}
            disabled={readOnly}
            onChange={(checked) => onChange({ ...values, contract_number_include_year: checked })}
            label="درج سال در شماره قرارداد"
          />
          <FormField
            label="پیشوند قرارداد"
            htmlFor={`${formId}-prefix`}
            error={fieldErrors.contract_number_prefix}
          >
            <Input
              id={`${formId}-prefix`}
              value={values.contract_number_prefix}
              disabled={readOnly}
              onChange={(event) => onChange({ ...values, contract_number_prefix: event.target.value })}
            />
          </FormField>
          <FormField label="پسوند قرارداد" htmlFor={`${formId}-suffix`}>
            <Input
              id={`${formId}-suffix`}
              value={values.contract_number_suffix ?? ''}
              disabled={readOnly}
              onChange={(event) => onChange({ ...values, contract_number_suffix: event.target.value })}
            />
          </FormField>
          <FormField label="طول صفرگذاری" htmlFor={`${formId}-pad`}>
            <Input
              id={`${formId}-pad`}
              type="number"
              min={4}
              max={10}
              value={values.contract_number_pad_length}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ ...values, contract_number_pad_length: Number(event.target.value || 4) })
              }
            />
          </FormField>
          <FormField label="شماره بعدی" htmlFor={`${formId}-next-seq`}>
            <Input
              id={`${formId}-next-seq`}
              value={String(values.contract_number_next_sequence)}
              disabled
              readOnly
            />
          </FormField>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-900">پیش‌نمایش شماره قرارداد</p>
          <p className="mt-1 font-mono text-lg text-emerald-800">{contractPreview}</p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={readOnly || !isDirty}>
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
        <Button type="button" variant="outline" disabled={readOnly || !isDirty} onClick={onReset}>
          بازنشانی
        </Button>
      </div>
    </form>
  );
}

export function InstallmentsSettingsFormSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="در حال بارگذاری تنظیمات اقساط">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-28 animate-pulse rounded bg-muted/70" />
        </div>
      ))}
    </div>
  );
}
