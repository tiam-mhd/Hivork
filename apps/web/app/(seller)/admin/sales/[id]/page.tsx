'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { useBreadcrumbOverride } from '@/components/layout/breadcrumb-override';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { CancelSaleModal } from '@/components/sales/cancel-sale-modal';
import { ContractDetailTabs } from '@/components/sales/contract-detail-tabs';
import { ContractLifecycleActions } from '@/components/sales/contract-lifecycle-actions';
import { SaleDetailHeader, SaleDetailHeaderSkeleton } from '@/components/sales/sale-detail-header';
import { usePermission } from '@/hooks/use-permission';
import { useSaleDetail } from '@/hooks/use-sale-detail';
import { useAdminSession } from '@/lib/layout/admin-session-context';

export default function SaleDetailPage() {
  return (
    <RequirePermission permission="installments.sale.view">
      <SaleDetailContent />
    </RequirePermission>
  );
}

function SaleDetailContent() {
  const params = useParams<{ id: string }>();
  const saleId = params.id;
  const { branches } = useAdminSession();
  const canCancel = usePermission('installments.sale.cancel');
  const canEdit = usePermission('installments.sale.edit');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const {
    sale,
    loading,
    error,
    notFound,
    forbidden,
    toast,
    cancelling,
    reload,
    cancel,
    clearToast,
  } = useSaleDetail(saleId);

  useBreadcrumbOverride(sale ? sale.contractNumber ?? sale.title ?? 'قرارداد' : null);

  useEffect(() => {
    if (!toast && !actionToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearToast();
      setActionToast(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [actionToast, clearToast, toast]);

  if (forbidden) {
    return <NoPermissionPage required="installments.sale.view" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <SaleDetailHeaderSkeleton />
        <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/20" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">قرارداد یافت نشد</h1>
        <p className="text-sm text-muted-foreground">این قرارداد وجود ندارد یا به آن دسترسی ندارید.</p>
        <Button asChild variant="outline">
          <Link href="/admin/sales">بازگشت به لیست فروش‌ها</Link>
        </Button>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm font-medium text-destructive">خطا در بارگذاری جزئیات فروش</p>
        {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
        <Button type="button" variant="outline" onClick={() => void reload()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  async function handleCancelConfirm(reason: string) {
    try {
      await cancel(reason);
      setCancelModalOpen(false);
    } catch {
      // Error surfaced via hook toast — keep modal open for retry
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {toast || actionToast ? (
        <p
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          role="status"
        >
          {actionToast ?? toast}
        </p>
      ) : null}

      <SaleDetailHeader
        sale={sale}
        branches={branches}
        canCancelPermission={canCancel}
        onCancelClick={() => setCancelModalOpen(true)}
      />
      <ContractLifecycleActions sale={sale} onUpdated={reload} onToast={setActionToast} />
      <ContractDetailTabs sale={sale} canEdit={canEdit} />

      <CancelSaleModal
        open={cancelModalOpen}
        sale={sale}
        loading={cancelling}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
