'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { InstallmentActionsMenu } from '@/components/installments/installment-actions-menu';
import { InstallmentDetailHeader } from '@/components/installments/installment-detail-header';
import { InstallmentSectionPlaceholder } from '@/components/installments/installment-section-placeholder';
import { useBreadcrumbOverride } from '@/components/layout/breadcrumb-override';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useInstallmentDetail } from '@/hooks/use-installment-detail';

export default function InstallmentDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequirePermission permission="installments.installment.view">
      <Suspense fallback={<InstallmentDetailSkeleton />}>
        <InstallmentDetailContent installmentId={params.id} />
      </Suspense>
    </RequirePermission>
  );
}

function InstallmentDetailSkeleton() {
  return <div className="h-40 animate-pulse rounded-xl bg-muted/30" aria-busy="true" />;
}

function InstallmentDetailContent({ installmentId }: { installmentId: string }) {
  const {
    detail,
    loading,
    error,
    forbidden,
    missingSaleId,
    reload,
    setVersion,
    breadcrumbLabel,
    saleId,
  } = useInstallmentDetail(installmentId);
  const [version, setLocalVersion] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  if (forbidden) {
    return <NoPermissionPage required="installments.installment.view" />;
  }

  if (missingSaleId) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="font-medium">شناسه قرارداد برای نمایش جزئیات لازم است.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          از لیست اقساط وارد شوید یا پارامتر saleId را در URL قرار دهید.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/installments">بازگشت به لیست اقساط</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <InstallmentDetailSkeleton />;
  }

  if (error || !detail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">{error ?? 'قسط یافت نشد.'}</p>
        <Button type="button" className="mt-4" onClick={() => void reload()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const effectiveVersion = detail.version ?? version;
  useBreadcrumbOverride(breadcrumbLabel ?? null);

  return (
    <div className="flex flex-col gap-4">
        {toast ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        ) : null}

        <InstallmentDetailHeader detail={detail} />

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">عملیات</h2>
          <InstallmentActionsMenu
            detail={detail}
            version={effectiveVersion}
            onRefresh={() => void reload()}
            onVersionChange={(next) => {
              setLocalVersion(next);
              setVersion(next);
            }}
            onToast={(message) => {
              setToast(message);
              window.setTimeout(() => setToast(null), 4000);
            }}
          />
        </section>

        <InstallmentSectionPlaceholder
          title="پرداخت‌ها"
          description="لیست تلاش‌های پرداخت و عملیات تأیید/رد/ابطال از API اختصاصی در نسخه بعدی تکمیل می‌شود."
        />

        <InstallmentSectionPlaceholder
          title="تاریخچه عملیات"
          description="لاگ عملیات پیشرفته (تعویق، ادغام، تقسیم و …) پس از API لیست در UI نمایش داده می‌شود."
        />

        <InstallmentSectionPlaceholder
          title="تعدیلات"
          description="جریمه‌ها و تخفیف‌های ثبت‌شده در این بخش نمایش داده می‌شوند."
        />

        <InstallmentSectionPlaceholder
          title="یادداشت داخلی"
          description="یادداشت اختصاص قسط در API بعدی اضافه می‌شود."
        />

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/installments">بازگشت به لیست</Link>
          </Button>
          {saleId ? (
            <Button asChild variant="outline">
              <Link href={`/admin/sales/${saleId}`}>مشاهده قرارداد</Link>
            </Button>
          ) : null}
        </div>
      </div>
  );
}
