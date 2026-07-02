'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import type { TenantCustomerDetailResponseDto } from '@hivork/contracts/customers';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@hivork/ui';
import Link from 'next/link';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';

import { CustomerAddressesSection } from '@/components/customers/customer-addresses-section';
import { CustomerStatsPanel } from '@/components/customers/customer-stats-panel';
import { TagsInput } from '@/components/customers/tags-input';
import { JalaliDatePicker } from '@/components/form/jalali-date-picker';
import { PhoneInput } from '@/components/form/phone-input';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import {
  EMPTY_CUSTOMER_FORM_VALUES,
  formsAreEqual,
  isPhoneReadOnly,
  type CustomerFormFieldErrors,
  type CustomerFormMode,
  type CustomerFormValues,
  hasFormErrors,
  validateCustomerForm,
} from '@/lib/schemas/customer-form.schema';

type CustomerFormProps = {
  mode: CustomerFormMode;
  initialValues?: CustomerFormValues;
  stats?: Pick<
    TenantCustomerDetailResponseDto,
    'creditScore' | 'overdueCount' | 'totalPurchaseRial' | 'lastPurchaseAt'
  >;
  branches: BranchListItemDto[];
  loading?: boolean;
  formError?: string | null;
  fieldErrors?: CustomerFormFieldErrors;
  onSubmit: (values: CustomerFormValues) => void | Promise<void>;
  cancelHref?: string;
  title: string;
};

type FieldProps = {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

function FormField({ label, htmlFor, help, error, required, children }: FieldProps) {
  const helpId = `${htmlFor}-help`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      {children}
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CustomerForm({
  mode,
  initialValues = EMPTY_CUSTOMER_FORM_VALUES,
  stats,
  branches,
  loading = false,
  formError = null,
  fieldErrors = {},
  onSubmit,
  cancelHref = '/admin/customers',
  title,
}: CustomerFormProps) {
  const formId = useId();
  const baselineRef = useRef(initialValues);
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [localErrors, setLocalErrors] = useState<CustomerFormFieldErrors>({});
  const isDirty = !formsAreEqual(values, baselineRef.current);
  const { confirmLeave } = useUnsavedWarning(isDirty);

  const errors = { ...localErrors, ...fieldErrors };

  const setField = useCallback(
    <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setLocalErrors((prev) => {
        if (!prev[key]) {
          return prev;
        }
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationErrors = validateCustomerForm(mode, values);
    if (hasFormErrors(validationErrors)) {
      setLocalErrors(validationErrors);
      const firstKey = Object.keys(validationErrors).find((key) => key !== 'addressErrors');
      if (firstKey) {
        const element = document.getElementById(`${formId}-${firstKey}`);
        element?.focus();
      }
      return;
    }

    await onSubmit(values);
  }

  function handleCancelClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!confirmLeave()) {
      event.preventDefault();
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="h-9 w-fit px-2 text-muted-foreground">
        <Link href={cancelHref} onClick={handleCancelClick}>
          ← بازگشت به لیست
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={cancelHref} onClick={handleCancelClick}>
            انصراف
          </Link>
        </Button>
      </div>

      {stats ? <CustomerStatsPanel stats={stats} /> : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">اطلاعات تماس</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <PhoneInput
            id={`${formId}-phone`}
            value={values.phone}
            onChange={(phone) => setField('phone', phone)}
            label="شماره موبایل"
            helpText={
              isPhoneReadOnly(mode)
                ? 'شماره موبایل پس از ثبت قابل تغییر نیست.'
                : 'شماره برای OTP و پیامک یادآور'
            }
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            required
            disabled={isPhoneReadOnly(mode) || loading}
            error={errors.phone}
          />

          <FormField
            label="نام و نام خانوادگی"
            htmlFor={`${formId}-name`}
            help="حداقل ۲ کاراکتر"
            error={errors.name}
            required
          >
            <Input
              id={`${formId}-name`}
              value={values.name}
              disabled={loading}
              placeholder="مثال: حسین احمدی"
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => setField('name', event.target.value)}
            />
          </FormField>

          <FormField
            label="ایمیل"
            htmlFor={`${formId}-email`}
            help="اختیاری — برای ارسال رسید"
            error={errors.email}
          >
            <Input
              id={`${formId}-email`}
              type="email"
              dir="ltr"
              className="text-start"
              value={values.email}
              disabled={loading}
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => setField('email', event.target.value)}
            />
          </FormField>

          <FormField
            label="کانال ترجیحی"
            htmlFor={`${formId}-preferredContactChannel`}
            help="تلگرام، پیامک، تماس"
          >
            <Select
              id={`${formId}-preferredContactChannel`}
              value={values.preferredContactChannel}
              disabled={loading}
              className="min-h-11"
              onChange={(event) =>
                setField(
                  'preferredContactChannel',
                  event.target.value as CustomerFormValues['preferredContactChannel'],
                )
              }
            >
              <option value="">انتخاب نشده</option>
              <option value="telegram">تلگرام</option>
              <option value="sms">پیامک</option>
              <option value="phone">تماس</option>
              <option value="bale">بله</option>
            </Select>
          </FormField>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={values.marketingOptIn}
              disabled={loading}
              onChange={(event) => setField('marketingOptIn', event.target.checked)}
            />
            دریافت پیام تبلیغاتی — پیام‌های پیشنهاد و تخفیف
          </label>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">هویت</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            label="کد ملی"
            htmlFor={`${formId}-nationalId`}
            help="برای قراردادهای رسمی"
            error={errors.nationalId}
          >
            <Input
              id={`${formId}-nationalId`}
              inputMode="numeric"
              maxLength={10}
              value={values.nationalId}
              disabled={loading}
              placeholder="۱۰ رقم"
              aria-invalid={Boolean(errors.nationalId)}
              onChange={(event) => setField('nationalId', event.target.value)}
            />
          </FormField>

          <JalaliDatePicker
            id={`${formId}-birthDate`}
            label="تاریخ تولد"
            helpText="تقویم شمسی"
            value={values.birthDate}
            disabled={loading}
            error={errors.birthDate}
            onChange={(iso) => setField('birthDate', iso)}
          />

          <FormField label="جنسیت" htmlFor={`${formId}-gender`}>
            <Select
              id={`${formId}-gender`}
              className="min-h-11"
              value={values.gender}
              disabled={loading}
              onChange={(event) =>
                setField('gender', event.target.value as CustomerFormValues['gender'])
              }
            >
              <option value="">ترجیح نمی‌دهم</option>
              <option value="male">مرد</option>
              <option value="female">زن</option>
              <option value="other">سایر</option>
              <option value="unspecified">نامشخص</option>
            </Select>
          </FormField>

          <FormField
            label="آدرس"
            htmlFor={`${formId}-address`}
            help="آدرس متنی ساده — برای آدرس با نقشه از بخش زیر استفاده کنید"
          >
            <Textarea
              id={`${formId}-address`}
              className="min-h-24"
              value={values.address}
              disabled={loading}
              placeholder="خیابان، پلاک، واحد"
              onChange={(event) => setField('address', event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">آدرس‌های ساخت‌یافته</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerAddressesSection
            addresses={values.addresses}
            disabled={loading}
            addressErrors={errors.addressErrors}
            onChange={(addresses) => setField('addresses', addresses)}
          />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">اطلاعات فروشگاه</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            label="کد محلی"
            htmlFor={`${formId}-localCode`}
            help="کد داخلی فروشگاه شما"
            error={errors.localCode}
          >
            <Input
              id={`${formId}-localCode`}
              value={values.localCode}
              disabled={loading}
              placeholder="C-001"
              onChange={(event) => setField('localCode', event.target.value)}
            />
          </FormField>

          <FormField
            label="شعبه پیش‌فرض"
            htmlFor={`${formId}-defaultBranchId`}
            help="برای فروش‌های جدید"
            error={errors.defaultBranchId}
          >
            <Select
              id={`${formId}-defaultBranchId`}
              className="min-h-11"
              value={values.defaultBranchId}
              disabled={loading}
              onChange={(event) => setField('defaultBranchId', event.target.value)}
            >
              <option value="">انتخاب نشده</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="md:col-span-2">
            <TagsInput
              id={`${formId}-tags`}
              value={values.tags}
              disabled={loading}
              error={errors.tags}
              onChange={(tags) => setField('tags', tags)}
            />
          </div>

          <FormField label="یادداشت" htmlFor={`${formId}-notes`} help="قابل مشاهده در پروفایل">
            <Textarea
              id={`${formId}-notes`}
              className="min-h-20"
              value={values.notes}
              disabled={loading}
              onChange={(event) => setField('notes', event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">یادداشت داخلی (فقط کارمندان)</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            label="یادداشت داخلی"
            htmlFor={`${formId}-internalNotes`}
            help="مشتری این بخش را نمی‌بیند"
            error={errors.internalNotes}
          >
            <Textarea
              id={`${formId}-internalNotes`}
              className="min-h-24"
              value={values.internalNotes}
              disabled={loading}
              onChange={(event) => setField('internalNotes', event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {formError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'در حال ذخیره…' : mode === 'create' ? 'ذخیره مشتری' : 'ذخیره تغییرات'}
        </Button>
      </div>
    </form>
  );
}
