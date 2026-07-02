'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { CustomerBlacklistBanner } from '@/components/customers/customer-blacklist-banner';
import { CustomerDetailActions } from '@/components/customers/customer-detail-actions';
import { CustomerDetailTabs } from '@/components/customers/customer-detail-tabs';
import { CustomerTableSkeleton } from '@/components/customers/customer-empty-state';
import { CustomerStatusBadge } from '@/components/customers/customer-status-badge';
import { useBreadcrumbOverride } from '@/components/layout/breadcrumb-override';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useApiError } from '@/hooks/use-api-error';
import { ApiClientError } from '@/lib/api/client';
import {
  useAssignedStaffName,
  useCustomerDetail,
} from '@/lib/api/customers';
import { maskPhone } from '@/lib/auth/phone-utils';

export default function CustomerDetailPage() {
  return (
    <RequirePermission permission="installments.customer.view">
      <CustomerDetailContent />
    </RequirePermission>
  );
}

function CustomerDetailContent() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { resolve } = useApiError();
  const [toast, setToast] = useState<string | null>(null);

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCustomerDetail(customerId, { include: ['salesSummary'] });

  const { data: assignedStaffName } = useAssignedStaffName(detail?.assignedStaffId);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const breadcrumbLabel = useMemo(() => {
    if (!detail) {
      return null;
    }
    return detail.globalCustomer.name?.trim() || 'جزئیات مشتری';
  }, [detail]);
  useBreadcrumbOverride(breadcrumbLabel);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <CustomerTableSkeleton />
      </div>
    );
  }

  if (error instanceof ApiClientError && error.httpStatus === 403) {
    return <NoPermissionPage required="installments.customer.view" backHref="/admin/customers" />;
  }

  if (isError || !detail) {
    let message = 'بارگذاری مشتری ناموفق بود.';
    if (error instanceof ApiClientError) {
      if (error.httpStatus === 404) {
        message = 'مشتری یافت نشد.';
      } else {
        message = resolve(error);
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-8">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">خطا</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-destructive">{message}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => void refetch()}>
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

  const isBlacklisted = Boolean(detail.isBlacklisted || detail.linkStatus === 'blacklisted');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {toast ? (
        <p
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          role="status"
        >
          {toast}
        </p>
      ) : null}

      {isFetching && !isLoading ? (
        <p className="text-xs text-muted-foreground" role="status">
          در حال به‌روزرسانی…
        </p>
      ) : null}

      {isBlacklisted ? <CustomerBlacklistBanner reason={detail.blacklistReason} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {detail.globalCustomer.name?.trim() || 'مشتری بدون نام'}
            </h1>
            <CustomerStatusBadge linkStatus={detail.linkStatus} isBlacklisted={detail.isBlacklisted} />
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground" dir="ltr">
            {maskPhone(detail.globalCustomer.phone)}
          </p>
          {assignedStaffName ? (
            <p className="mt-1 text-sm text-muted-foreground">مسئول: {assignedStaffName}</p>
          ) : null}
        </div>

        <CustomerDetailActions
          customerId={customerId}
          detail={detail}
          onToast={setToast}
          onDetailChanged={() => void refetch()}
        />
      </div>

      <CustomerDetailTabs
        customerId={customerId}
        detail={detail}
        assignedStaffName={assignedStaffName}
        onToast={setToast}
      />
    </div>
  );
}
