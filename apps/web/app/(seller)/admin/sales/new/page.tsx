'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { SaleConfirmStep } from '@/components/sales/sale-confirm-step';
import { SaleCreateForm } from '@/components/sales/sale-create-form';
import { useActiveBranch } from '@/hooks/use-active-branch';
import { useApiError } from '@/hooks/use-api-error';
import { computeInstallmentPreview } from '@/hooks/use-installment-preview';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { ApiClientError } from '@/lib/api/client';
import { createSale, createSaleIdempotencyKey } from '@/lib/api/create-sale';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import {
  EMPTY_SALE_FORM_VALUES,
  formValuesToCreateDto,
  mapSaleApiErrorToFieldErrors,
  saleFormsAreEqual,
  validateSaleForm,
  type SaleFormFieldErrors,
  type SaleFormValues,
  type SelectedSaleCustomer,
} from '@/lib/schemas/sale-form.schema';

type WizardStep = 'form' | 'confirm';

export default function NewSalePage() {
  return (
    <RequirePermission permission="installments.sale.create">
      <NewSaleContent />
    </RequirePermission>
  );
}

function NewSaleContent() {
  const router = useRouter();
  const { branches } = useAdminSession();
  const { activeBranchId } = useActiveBranch();
  const { resolve } = useApiError();

  const baselineRef = useRef<SaleFormValues>(EMPTY_SALE_FORM_VALUES);
  const idempotencyKeyRef = useRef<string>(createSaleIdempotencyKey());

  const [step, setStep] = useState<WizardStep>('form');
  const [values, setValues] = useState<SaleFormValues>(EMPTY_SALE_FORM_VALUES);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedSaleCustomer | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SaleFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.isActive),
    [branches],
  );

  const isDirty = step === 'form' && !saleFormsAreEqual(values, baselineRef.current);
  const { confirmLeave } = useUnsavedWarning(isDirty);

  useEffect(() => {
    if (!activeBranchId || values.branchId) {
      return;
    }
    setValues((prev) => ({ ...prev, branchId: activeBranchId }));
    baselineRef.current = { ...baselineRef.current, branchId: activeBranchId };
  }, [activeBranchId, values.branchId]);

  const preview = useMemo(() => computeInstallmentPreview(values), [values]);

  const branchName =
    activeBranches.find((branch) => branch.id === values.branchId)?.name ?? '—';

  const handleContinue = useCallback(() => {
    const validationErrors = validateSaleForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError(null);
      return;
    }

    if (!selectedCustomer) {
      setFieldErrors({ tenantCustomerId: 'انتخاب مشتری الزامی است.' });
      return;
    }

    if (!preview.sumMatches) {
      setFormError('پیش‌نمایش اقساط معتبر نیست. مقادیر را بررسی کنید.');
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setStep('confirm');
  }, [preview.sumMatches, selectedCustomer, values]);

  const handleBack = useCallback(() => {
    setStep('form');
    setFormError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedCustomer || loading) {
      return;
    }

    setLoading(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const created = await createSale(formValuesToCreateDto(values), idempotencyKeyRef.current);
      setSuccessMessage('فروش با موفقیت ثبت شد.');
      window.setTimeout(() => {
        router.push(`/admin/sales/${created.id}`);
      }, 800);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const mapped = mapSaleApiErrorToFieldErrors(err.code, err.message, err.details);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          if (step === 'confirm') {
            setStep('form');
          }
        }
        setFormError(resolve(err));
      } else {
        setFormError('ثبت فروش ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, resolve, router, selectedCustomer, step, values]);

  useEffect(() => {
    function onPopState() {
      if (step === 'form' && !confirmLeave()) {
        window.history.pushState(null, '', window.location.href);
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [confirmLeave, step]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold">فروش جدید</h1>

      {successMessage ? (
        <p
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      {step === 'form' ? (
        <SaleCreateForm
          values={values}
          selectedCustomer={selectedCustomer}
          branches={activeBranches}
          fieldErrors={fieldErrors}
          formError={formError}
          loading={loading}
          onValuesChange={setValues}
          onCustomerChange={setSelectedCustomer}
          onContinue={handleContinue}
        />
      ) : selectedCustomer ? (
        <SaleConfirmStep
          values={values}
          selectedCustomer={selectedCustomer}
          branchName={branchName}
          preview={preview}
          loading={loading}
          formError={formError}
          onBack={handleBack}
          onConfirm={() => void handleConfirm()}
        />
      ) : null}
    </div>
  );
}
