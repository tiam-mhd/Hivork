'use client';

import type { CheckSummaryDto } from '@hivork/contracts/payments';
import type { PaymentTransactionListItemDto } from '@hivork/contracts/payments';
import type { CheckStatusDto, CheckTypeDto } from '@hivork/contracts/payments';
import type { PaymentLedgerEntryStatusDto } from '@hivork/contracts/payments';
import { Button } from '@hivork/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { CheckDetailDrawer } from '@/components/payments/check-detail-drawer';
import { CheckFormModal } from '@/components/payments/check-form-modal';
import { ChecksTable, ChecksTableSkeleton } from '@/components/payments/checks-table';
import { ReconciliationPanel } from '@/components/payments/reconciliation-panel';
import { SettlementPanel } from '@/components/payments/settlement-panel';
import { TransactionDetailDrawer } from '@/components/payments/transaction-detail-drawer';
import {
  TransactionsTable,
  TransactionsTableSkeleton,
} from '@/components/payments/transactions-table';
import { useChecksList } from '@/hooks/use-checks-list';
import { usePaymentTransactionsList } from '@/hooks/use-payment-transactions-list';
import { usePermission } from '@/hooks/use-permission';

type PaymentsTab = 'transactions' | 'checks' | 'settlement' | 'reconciliation';

const TABS: Array<{ id: PaymentsTab; label: string }> = [
  { id: 'transactions', label: 'تراکنش‌ها' },
  { id: 'checks', label: 'چک‌ها' },
  { id: 'settlement', label: 'تسویه' },
  { id: 'reconciliation', label: 'مغایرت' },
];

export default function PaymentsPage() {
  return (
    <RequirePermission permission="installments.payment.read">
      <Suspense fallback={<PaymentsPageSkeleton />}>
        <PaymentsPageContent />
      </Suspense>
    </RequirePermission>
  );
}

function PaymentsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
      <TransactionsTableSkeleton />
    </div>
  );
}

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as PaymentsTab | null) ?? 'transactions';
  const [tab, setTab] = useState<PaymentsTab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'transactions',
  );

  const canReadChecks = usePermission('installments.check.read');
  const canCreateCheck = usePermission('installments.check.create');

  const [txnFilters, setTxnFilters] = useState<{
    status?: PaymentLedgerEntryStatusDto;
    paymentMethod?: string;
    search?: string;
  }>({});
  const [checkFilters, setCheckFilters] = useState<{
    checkType?: CheckTypeDto;
    status?: CheckStatusDto;
  }>({});

  const transactions = usePaymentTransactionsList(txnFilters);
  const checks = useChecksList(checkFilters);

  const [selectedTxn, setSelectedTxn] = useState<PaymentTransactionListItemDto | null>(null);
  const [selectedCheck, setSelectedCheck] = useState<CheckSummaryDto | null>(null);
  const [checkFormMode, setCheckFormMode] = useState<'received' | 'payable' | null>(null);
  const [reconciliationReportId, setReconciliationReportId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeListForbidden = useMemo(() => {
    if (tab === 'checks') return checks.forbidden;
    if (tab === 'transactions') return transactions.forbidden;
    return false;
  }, [tab, checks.forbidden, transactions.forbidden]);

  if (activeListForbidden) {
    return <NoPermissionPage required="installments.payment.read" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">پرداخت‌ها</h1>
        {tab === 'checks' && canCreateCheck ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setCheckFormMode('received')}>
              ثبت چک دریافتی
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCheckFormMode('payable')}>
              ثبت چک پرداختی
            </Button>
          </div>
        ) : null}
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto border-b border-border px-1 pb-px"
        role="tablist"
        aria-label="بخش‌های پرداخت"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {toast ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </p>
      ) : null}

      {tab === 'transactions' ? (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={txnFilters.status ?? ''}
              onChange={(event) =>
                setTxnFilters((prev) => ({
                  ...prev,
                  status: (event.target.value as PaymentLedgerEntryStatusDto) || undefined,
                }))
              }
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="posted">ثبت‌شده</option>
              <option value="voided">ابطال‌شده</option>
            </select>
            <input
              type="search"
              placeholder="جستجو..."
              className="min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={txnFilters.search ?? ''}
              onChange={(event) =>
                setTxnFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </div>
          {transactions.loading ? (
            <TransactionsTableSkeleton />
          ) : (
            <TransactionsTable
              items={transactions.items}
              loading={transactions.loading}
              loadingMore={transactions.loadingMore}
              error={transactions.error}
              hasMore={transactions.hasMore}
              onRetry={transactions.retry}
              onLoadMore={transactions.loadMore}
              onSelect={setSelectedTxn}
            />
          )}
        </>
      ) : null}

      {tab === 'checks' ? (
        canReadChecks ? (
          <>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={checkFilters.checkType ?? ''}
                onChange={(event) =>
                  setCheckFilters((prev) => ({
                    ...prev,
                    checkType: (event.target.value as CheckTypeDto) || undefined,
                  }))
                }
              >
                <option value="">همه انواع</option>
                <option value="received">دریافتی</option>
                <option value="payable">پرداختی</option>
              </select>
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={checkFilters.status ?? ''}
                onChange={(event) =>
                  setCheckFilters((prev) => ({
                    ...prev,
                    status: (event.target.value as CheckStatusDto) || undefined,
                  }))
                }
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="registered">ثبت‌شده</option>
                <option value="due">سررسید</option>
                <option value="collected">وصول‌شده</option>
                <option value="bounced">برگشتی</option>
                <option value="transferred">منتقل‌شده</option>
              </select>
            </div>
            {checks.loading ? (
              <ChecksTableSkeleton />
            ) : (
              <ChecksTable
                items={checks.items}
                loading={checks.loading}
                loadingMore={checks.loadingMore}
                error={checks.error}
                hasMore={checks.hasMore}
                onRetry={checks.retry}
                onLoadMore={checks.loadMore}
                onSelect={setSelectedCheck}
              />
            )}
          </>
        ) : (
          <NoPermissionPage required="installments.check.read" />
        )
      ) : null}

      {tab === 'settlement' ? (
        <SettlementPanel
          onReconciliationReport={(id) => {
            setReconciliationReportId(id);
            setTab('reconciliation');
          }}
        />
      ) : null}

      {tab === 'reconciliation' ? (
        <ReconciliationPanel reportId={reconciliationReportId} />
      ) : null}

      <TransactionDetailDrawer
        item={selectedTxn}
        open={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        onUpdated={() => {
          transactions.refresh();
          setToast('تراکنش به‌روزرسانی شد.');
        }}
      />

      <CheckDetailDrawer
        check={selectedCheck}
        open={Boolean(selectedCheck)}
        onClose={() => setSelectedCheck(null)}
        onUpdated={() => {
          checks.refresh();
          setToast('چک به‌روزرسانی شد.');
        }}
      />

      {checkFormMode ? (
        <CheckFormModal
          open
          mode={checkFormMode}
          onClose={() => setCheckFormMode(null)}
          onSuccess={() => {
            checks.refresh();
            setToast('چک با موفقیت ثبت شد.');
          }}
        />
      ) : null}
    </div>
  );
}
