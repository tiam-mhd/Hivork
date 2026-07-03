'use client';

import type { PaymentTransactionListItemDto } from '@hivork/contracts/payments';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { TransactionDetailDrawer } from '@/components/payments/transaction-detail-drawer';
import { ApiClientError } from '@/lib/api/client';
import { listPaymentTransactions } from '@/lib/api/payments';

export default function TransactionDetailPage() {
  return (
    <RequirePermission permission="installments.payment.read">
      <Suspense fallback={<p className="text-sm text-muted-foreground">در حال بارگذاری...</p>}>
        <TransactionDetailPageContent />
      </Suspense>
    </RequirePermission>
  );
}

function TransactionDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<PaymentTransactionListItemDto | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await listPaymentTransactions({ limit: 100 });
        const found = result.items.find((entry) => entry.id === params.id) ?? null;
        if (!cancelled) {
          setItem(found);
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
    return <NoPermissionPage required="installments.payment.read" />;
  }

  if (notFound && !item) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground">تراکنش یافت نشد.</p>
        <button
          type="button"
          className="mt-4 text-primary hover:underline"
          onClick={() => router.push('/admin/payments?tab=transactions')}
        >
          بازگشت به لیست تراکنش‌ها
        </button>
      </div>
    );
  }

  return (
    <TransactionDetailDrawer
      item={item}
      open={Boolean(item)}
      onClose={() => router.push('/admin/payments?tab=transactions')}
      onUpdated={() => undefined}
    />
  );
}
