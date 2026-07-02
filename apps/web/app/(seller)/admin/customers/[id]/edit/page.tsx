'use client';

import type { TenantCustomerDetailResponseDto } from '@hivork/contracts/customers';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { CustomerTableSkeleton } from '@/components/customers/customer-empty-state';
import { CustomerForm } from '@/components/customers/customer-form';
import { OptimisticLockDialog } from '@/components/customers/optimistic-lock-dialog';
import { useBreadcrumbOverride } from '@/components/layout/breadcrumb-override';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useApiError } from '@/hooks/use-api-error';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import { fetchCustomerDetail } from '@/lib/api/customers';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import {
  buildUpdatePatch,
  detailToFormValues,
  mapApiErrorToFieldErrors,
  type CustomerFormFieldErrors,
  type CustomerFormValues,
} from '@/lib/schemas/customer-form.schema';

export default function EditCustomerPage() {
  return (
    <RequirePermission permission="installments.customer.update">
      <EditCustomerContent />
    </RequirePermission>
  );
}

function EditCustomerContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { branches } = useAdminSession();
  const { resolve } = useApiError();

  const [detail, setDetail] = useState<TenantCustomerDetailResponseDto | null>(null);
  const [initialValues, setInitialValues] = useState<CustomerFormValues | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [optimisticLockOpen, setOptimisticLockOpen] = useState(false);
  const [reloadingAfterConflict, setReloadingAfterConflict] = useState(false);

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.isActive),
    [branches],
  );

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setLoadError(null);
    setForbidden(false);

    try {
      const response = await fetchCustomerDetail(customerId);
      setDetail(response);
      setInitialValues(detailToFormValues(response));
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        setForbidden(true);
        return;
      }
      if (err instanceof ApiClientError && err.httpStatus === 404) {
        setLoadError('مشتری یافت نشد.');
        return;
      }
      setLoadError(err instanceof ApiClientError ? resolve(err) : 'بارگذاری مشتری ناموفق بود.');
    } finally {
      setLoadingDetail(false);
    }
  }, [customerId, resolve]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const breadcrumbLabel = detail?.globalCustomer.name?.trim()
    ? detail.globalCustomer.name.trim()
    : detail
      ? 'جزئیات مشتری'
      : null;
  useBreadcrumbOverride(breadcrumbLabel);

  const handleReloadAfterConflict = useCallback(async () => {
    setReloadingAfterConflict(true);
    try {
      await loadDetail();
      setOptimisticLockOpen(false);
      setFormError(null);
      setFieldErrors({});
    } finally {
      setReloadingAfterConflict(false);
    }
  }, [loadDetail]);

  async function handleSubmit(values: CustomerFormValues) {
    if (!detail || !initialValues) {
      return;
    }

    const patch = buildUpdatePatch(initialValues, values, detail.version);
    if (!patch) {
      router.push(`/admin/customers/${customerId}`);
      return;
    }

    setLoadingSave(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await apiFetch(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });

      setSuccessMessage('تغییرات با موفقیت ذخیره شد.');
      window.setTimeout(() => {
        router.push(`/admin/customers/${customerId}`);
      }, 1200);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'OPTIMISTIC_LOCK_CONFLICT') {
          setOptimisticLockOpen(true);
        } else {
          const mapped = mapApiErrorToFieldErrors(err.code, err.message, err.details);
          if (Object.keys(mapped).length > 0) {
            setFieldErrors(mapped);
          }
          setFormError(resolve(err));
        }
      } else {
        setFormError('ذخیره تغییرات ناموفق بود.');
      }
    } finally {
      setLoadingSave(false);
    }
  }

  if (forbidden) {
    return <NoPermissionPage required="installments.customer.update" />;
  }

  if (loadingDetail) {
    return (
      <div className="mx-auto max-w-3xl">
        <CustomerTableSkeleton />
      </div>
    );
  }

  if (loadError || !detail || !initialValues) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-8">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">خطا</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-destructive">{loadError ?? 'مشتری در دسترس نیست.'}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => void loadDetail()}>
                تلاش مجدد
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/customers">بازگشت به لیست</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {successMessage ? (
        <p
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <CustomerForm
        key={`${detail.id}-${detail.version}`}
        mode="edit"
        initialValues={initialValues}
        stats={{
          creditScore: detail.creditScore,
          overdueCount: detail.overdueCount,
          totalPurchaseRial: detail.totalPurchaseRial,
          lastPurchaseAt: detail.lastPurchaseAt,
        }}
        branches={activeBranches}
        loading={loadingSave}
        formError={formError}
        fieldErrors={fieldErrors}
        title="ویرایش مشتری"
        onSubmit={handleSubmit}
      />

      <OptimisticLockDialog
        open={optimisticLockOpen}
        loading={reloadingAfterConflict}
        onReload={() => void handleReloadAfterConflict()}
        onClose={() => setOptimisticLockOpen(false)}
      />
    </div>
  );
}
