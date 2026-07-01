'use client';

import type { TenantCustomerResponseDto } from '@hivork/contracts/customers';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { CustomerForm } from '@/components/customers/customer-form';
import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import {
  EMPTY_CUSTOMER_FORM_VALUES,
  formValuesToCreateDto,
  mapApiErrorToFieldErrors,
  type CustomerFormFieldErrors,
  type CustomerFormValues,
} from '@/lib/schemas/customer-form.schema';

export default function NewCustomerPage() {
  return (
    <RequirePermission permission="installments.customer.create">
      <Suspense fallback={<div className="h-32 animate-pulse rounded bg-neutral-100" />}>
        <NewCustomerContent />
      </Suspense>
    </RequirePermission>
  );
}

function NewCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { branches } = useAdminSession();
  const { resolve } = useApiError();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.isActive),
    [branches],
  );

  async function handleSubmit(values: CustomerFormValues) {
    setLoading(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await apiFetch<TenantCustomerResponseDto>('/customers', {
        method: 'POST',
        body: JSON.stringify(formValuesToCreateDto(values)),
      });

      setSuccessMessage('مشتری با موفقیت ثبت شد.');
      window.setTimeout(() => {
        if (returnTo && returnTo.startsWith('/admin/')) {
          router.push(returnTo);
        } else {
          router.push('/admin/customers');
        }
      }, 1200);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const mapped = mapApiErrorToFieldErrors(err.code, err.message, err.details);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
        }
        setFormError(resolve(err));
      } else {
        setFormError('ثبت مشتری ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {successMessage}
        </p>
      ) : null}

      <CustomerForm
        mode="create"
        initialValues={EMPTY_CUSTOMER_FORM_VALUES}
        branches={activeBranches}
        loading={loading}
        formError={formError}
        fieldErrors={fieldErrors}
        title="ثبت مشتری جدید"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
