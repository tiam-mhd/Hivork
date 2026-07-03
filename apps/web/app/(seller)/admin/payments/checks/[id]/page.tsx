'use client';

import type { CheckSummaryDto } from '@hivork/contracts/payments';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { CheckDetailDrawer } from '@/components/payments/check-detail-drawer';
import { ApiClientError } from '@/lib/api/client';
import { listChecks } from '@/lib/api/payments';

export default function CheckDetailPage() {
  return (
    <RequirePermission permission="installments.check.read">
      <Suspense fallback={<p className="text-sm text-muted-foreground">در حال بارگذاری...</p>}>
        <CheckDetailPageContent />
      </Suspense>
    </RequirePermission>
  );
}

function CheckDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [check, setCheck] = useState<CheckSummaryDto | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await listChecks({ limit: 100 });
        const found = result.items.find((item) => item.id === params.id) ?? null;
        if (!cancelled) {
          setCheck(found);
          setNotFound(!found);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiClientError && err.httpStatus === 403) {
            setForbidden(true);
          } else {
            setNotFound(true);
          }
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (forbidden) {
    return <NoPermissionPage required="installments.check.read" />;
  }

  if (notFound && !check) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground">چک یافت نشد.</p>
        <button
          type="button"
          className="mt-4 text-primary hover:underline"
          onClick={() => router.push('/admin/payments?tab=checks')}
        >
          بازگشت به لیست چک‌ها
        </button>
      </div>
    );
  }

  return (
    <CheckDetailDrawer
      check={check}
      open={Boolean(check)}
      onClose={() => router.push('/admin/payments?tab=checks')}
      onUpdated={() => undefined}
    />
  );
}
