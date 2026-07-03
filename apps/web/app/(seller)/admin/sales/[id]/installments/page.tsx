'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import {
  InstallmentsDataTable,
  InstallmentsDataTableSkeleton,
} from '@/components/installments/installments-data-table';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useInstallmentsList } from '@/hooks/use-installments-list';

export default function SaleInstallmentsPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequirePermission permission="installments.sale.view">
      <Suspense fallback={<InstallmentsDataTableSkeleton />}>
        <SaleInstallmentsContent saleId={params.id} />
      </Suspense>
    </RequirePermission>
  );
}

function SaleInstallmentsContent({ saleId }: { saleId: string }) {
  const { items, loading, error, forbidden, retry, isEmpty } = useInstallmentsList(saleId);

  if (forbidden) {
    return <NoPermissionPage required="installments.sale.view" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">اقساط قرارداد</h1>
          <p className="text-sm text-muted-foreground">
            {formatPersianDigits(items.length)} قسط
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/sales/${saleId}`}>بازگشت به قرارداد</Link>
        </Button>
      </div>

      {loading ? (
        <InstallmentsDataTableSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">{error}</p>
          <Button type="button" className="mt-4" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="font-medium">قسطی برای این قرارداد یافت نشد.</p>
        </div>
      ) : (
        <InstallmentsDataTable items={items} />
      )}
    </div>
  );
}
